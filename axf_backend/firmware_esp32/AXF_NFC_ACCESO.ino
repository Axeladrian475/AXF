/*
 * AXF GymNet — Control de Acceso + Aforo
 * ESP32 con lector NFC PN532 (SPI)
 *
 * Lógica de aforo:
 *   - Primera pasada del día  → ENTRADA  (personas_dentro++)
 *   - Segunda pasada del día  → SALIDA   (personas_dentro--)
 *   - El backend decide si es Entrada o Salida consultando el
 *     último movimiento del suscriptor en la tabla `accesos`.
 *   - El ESP32 solo envía el UID y recibe el resultado completo.
 *
 * Respuesta del backend (POST /api/hardware/acceso/sucursal):
 *   {
 *     resultado:       "Permitido" | "Denegado_Sin_Sub" | "Denegado_No_Encontrado"
 *     nombre:          "Nombre Apellido"
 *     movimiento:      "Entrada" | "Salida"
 *     personas_dentro: <número entero>
 *   }
 */

#include <SPI.h>
#include <Adafruit_PN532.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN — edita solo esta sección antes de flashear
// ─────────────────────────────────────────────────────────────────────────────

const char* WIFI_SSID     = "Mega_2.4G_6F7B";
const char* WIFI_PASSWORD = "7Qk93cRx";
const char* SERVER_URL    = "http://10.53.173.156:3001";
const char* API_KEY       = "axf_esp32_2025";

// ID de la sucursal donde está instalado este dispositivo.
// Debe coincidir con el id_sucursal de la tabla `sucursales` en MySQL.
const int ID_SUCURSAL = 1;

// Tiempo mínimo entre dos lecturas NFC (ms) — evita doble registro accidental
const unsigned long DEBOUNCE_MS = 2500;

// ─────────────────────────────────────────────────────────────────────────────
// PINES NFC (SPI)
// ─────────────────────────────────────────────────────────────────────────────
#define PN532_SCK   18
#define PN532_MISO  19
#define PN532_MOSI  23
#define PN532_SS     5

// ─────────────────────────────────────────────────────────────────────────────
// PINES OPCIONALES — descomenta si tienes estos componentes
// ─────────────────────────────────────────────────────────────────────────────
// #define RELAY_PIN   26   // Cerradura / torniquete
// #define LED_VERDE   27   // Acceso concedido
// #define LED_ROJO    14   // Acceso denegado
// #define BUZZER_PIN  12   // Buzzer activo-alto

// ─────────────────────────────────────────────────────────────────────────────
// OBJETO NFC
// ─────────────────────────────────────────────────────────────────────────────
Adafruit_PN532 nfc(PN532_SS);

// ─────────────────────────────────────────────────────────────────────────────
// ESTADO GLOBAL
// ─────────────────────────────────────────────────────────────────────────────
unsigned long ultimaLectura  = 0;
int           aforoActual     = 0;   // Se actualiza con cada respuesta del backend

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

// Convierte UID bytes → "AA:BB:CC:DD"
String uidToString(uint8_t* uid, uint8_t len) {
  String s = "";
  for (uint8_t i = 0; i < len; i++) {
    if (uid[i] < 0x10) s += "0";
    s += String(uid[i], HEX);
    if (i < len - 1) s += ":";
  }
  s.toUpperCase();
  return s;
}

// ─────────────────────────────────────────────────────────────────────────────
// FEEDBACK FÍSICO
// ─────────────────────────────────────────────────────────────────────────────

void feedbackPermitido() {
  #ifdef LED_VERDE
    digitalWrite(LED_VERDE, HIGH);
  #endif
  #ifdef RELAY_PIN
    digitalWrite(RELAY_PIN, HIGH);
    delay(3000);
    digitalWrite(RELAY_PIN, LOW);
  #else
    delay(2000);
  #endif
  #ifdef LED_VERDE
    digitalWrite(LED_VERDE, LOW);
  #endif
}

void feedbackDenegado() {
  #ifdef LED_ROJO
    digitalWrite(LED_ROJO, HIGH);
  #endif
  for (int i = 0; i < 3; i++) {
    #ifdef BUZZER_PIN
      digitalWrite(BUZZER_PIN, HIGH);
    #endif
    delay(150);
    #ifdef BUZZER_PIN
      digitalWrite(BUZZER_PIN, LOW);
    #endif
    delay(150);
  }
  delay(500);
  #ifdef LED_ROJO
    digitalWrite(LED_ROJO, LOW);
  #endif
}

// ─────────────────────────────────────────────────────────────────────────────
// NÚCLEO: envía UID al backend y procesa la respuesta de aforo
//
// El backend (routes/hardware.routes.js → POST /api/hardware/acceso/sucursal):
//   1. Busca al suscriptor por nfc_uid
//   2. Verifica suscripción activa
//   3. Consulta el ÚLTIMO acceso "Permitido" del suscriptor en esta sucursal
//      para decidir si el movimiento es Entrada o Salida:
//         - Si no hay acceso previo hoy, o el último fue Salida  → Entrada
//         - Si el último fue Entrada                             → Salida
//   4. Actualiza sucursal_aforo (personas_dentro +1 o -1)
//   5. Inserta fila en tabla accesos con tipo_movimiento
//   6. Otorga 10 puntos al suscriptor si es Entrada permitida
//   7. Devuelve JSON con resultado, nombre, movimiento, personas_dentro
// ─────────────────────────────────────────────────────────────────────────────
void procesarAccesoSucursal(const String& uidStr) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WIFI] Sin conexión — acceso no procesado");
    return;
  }

  Serial.println("[NFC] UID leído: " + uidStr);
  Serial.println("[HTTP] Consultando backend...");

  HTTPClient http;
  http.begin(String(SERVER_URL) + "/api/hardware/acceso/sucursal");
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(6000);

  // Body JSON
  StaticJsonDocument<256> doc;
  doc["api_key"]     = API_KEY;
  doc["tipo"]        = "nfc";
  doc["valor"]       = uidStr;
  doc["id_sucursal"] = ID_SUCURSAL;

  String body;
  serializeJson(doc, body);

  int    code = http.POST(body);
  String resp = http.getString();
  http.end();

  Serial.printf("[HTTP] Código: %d\n", code);

  if (code != 200) {
    Serial.println("[ERROR] No se pudo contactar al servidor.");
    feedbackDenegado();
    return;
  }

  // Parsear respuesta
  StaticJsonDocument<256> respDoc;
  DeserializationError err = deserializeJson(respDoc, resp);

  if (err) {
    Serial.println("[ERROR] Respuesta JSON inválida del servidor.");
    feedbackDenegado();
    return;
  }

  const char* resultado      = respDoc["resultado"]       | "Denegado_No_Encontrado";
  const char* nombre         = respDoc["nombre"]          | "Desconocido";
  const char* movimiento     = respDoc["movimiento"]      | "-";
  int         personasDentro = respDoc["personas_dentro"] | 0;

  // Actualizar aforo local
  aforoActual = personasDentro;

  // ── Imprimir resultado completo ────────────────────────────────────────────
  Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  Serial.printf("  Suscriptor    : %s\n",  nombre);
  Serial.printf("  Movimiento    : %s\n",  movimiento);
  Serial.printf("  Resultado     : %s\n",  resultado);
  Serial.printf("  Aforo actual  : %d persona(s)\n", aforoActual);
  Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // ── Accionar feedback físico ───────────────────────────────────────────────
  if (strcmp(resultado, "Permitido") == 0) {
    if (strcmp(movimiento, "Entrada") == 0) {
      Serial.println("[ACCESO] ✓ ENTRADA concedida.");
    } else {
      Serial.println("[ACCESO] ✓ SALIDA registrada.");
    }
    feedbackPermitido();
  } else {
    if (strcmp(resultado, "Denegado_Sin_Sub") == 0) {
      Serial.println("[ACCESO] ✗ Denegado — suscripción inactiva o vencida.");
    } else {
      Serial.println("[ACCESO] ✗ Denegado — tarjeta NFC no registrada.");
    }
    feedbackDenegado();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SETUP
// ─────────────────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(600);

  Serial.println("\n================================================");
  Serial.println("   AXF GymNet — Control de Acceso + Aforo");
  Serial.printf ("   Sucursal ID: %d\n", ID_SUCURSAL);
  Serial.println("   Firmware v2.0 (NFC + Aforo Dinámico)");
  Serial.println("================================================\n");

  // Pines de salida opcionales
  #ifdef RELAY_PIN
    pinMode(RELAY_PIN, OUTPUT);
    digitalWrite(RELAY_PIN, LOW);
  #endif
  #ifdef LED_VERDE
    pinMode(LED_VERDE, OUTPUT);
    digitalWrite(LED_VERDE, LOW);
  #endif
  #ifdef LED_ROJO
    pinMode(LED_ROJO, OUTPUT);
    digitalWrite(LED_ROJO, LOW);
  #endif
  #ifdef BUZZER_PIN
    pinMode(BUZZER_PIN, OUTPUT);
    digitalWrite(BUZZER_PIN, LOW);
  #endif

  // WiFi
  Serial.print("[WIFI] Conectando a " + String(WIFI_SSID));
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int intentos = 0;
  while (WiFi.status() != WL_CONNECTED && intentos < 24) {
    delay(500);
    Serial.print(".");
    intentos++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WIFI] Conectado ✓  IP: " + WiFi.localIP().toString());
  } else {
    Serial.println("\n[WIFI] No conectado — reintentando en loop");
  }

  // NFC
  SPI.begin(PN532_SCK, PN532_MISO, PN532_MOSI, PN532_SS);
  nfc.begin();
  uint32_t ver = nfc.getFirmwareVersion();
  if (!ver) {
    Serial.println("[NFC] ERROR — PN532 no encontrado. Verifica pines SCK=18 MISO=19 MOSI=23 SS=5");
  } else {
    nfc.SAMConfig();
    Serial.printf("[NFC] OK ✓  (PN5%02x firmware v%d.%d)\n",
      (ver >> 24) & 0xFF, (ver >> 16) & 0xFF, (ver >> 8) & 0xFF);
  }

  Serial.println("\n[INFO] Listo. Esperando tarjetas NFC...\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// LOOP
// ─────────────────────────────────────────────────────────────────────────────
void loop() {
  // Reconectar WiFi si se perdió
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WIFI] Reconectando...");
    WiFi.reconnect();
    delay(3000);
    return;
  }

  // Anti-rebote: esperar DEBOUNCE_MS entre lecturas
  if (millis() - ultimaLectura < DEBOUNCE_MS) {
    delay(100);
    return;
  }

  // Leer tarjeta NFC (timeout 3 s, no bloquea indefinidamente)
  uint8_t uid[7];
  uint8_t uidLen = 0;
  bool detectado = nfc.readPassiveTargetID(PN532_MIFARE_ISO14443A, uid, &uidLen, 3000);

  if (detectado) {
    ultimaLectura = millis();
    String uidStr = uidToString(uid, uidLen);
    procesarAccesoSucursal(uidStr);
  }
}
