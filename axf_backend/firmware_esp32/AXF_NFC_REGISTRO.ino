// ============================================================================
//  AXF GymNet — ESP32 Firmware FINAL
//  Base: v3.0 (que funcionaba) + adaptaciones para frontend actual
//
//  CAMBIOS respecto a v3:
//  ─────────────────────────────────────────────────────────────────────────
//  1. Eliminado modoAcceso() — este ESP32 es solo AEAregistro.
//
//  2. Polling unificado con /siguiente/cualquiera — un solo request detecta
//     nfc, huella_enroll Y huella_leer (en v3 faltaba huella_leer).
//
//  3. Evento huella_enroll → manda tipo "huella_enroll" (el frontend actual
//     crea tokens con ese tipo; v3 mandaba "huella" que ya no coincide).
//
//  4. CMD_SEARCH igual que v3 (10 páginas, checksum 0x18 — el que funciona).
//     v7 lo cambió a 256 páginas y aunque el checksum era válido, algunos
//     sensores R307 ignoran búsquedas muy grandes. Usamos el original.
//
//  5. Posición huella guardada en NVS flash (no se pierde al reiniciar).
//
//  6. Poll cada 400ms en lugar de 2000ms del v3 — respuesta más rápida.
//     Sin modoAcceso() el loop es libre, 400ms es seguro.
//
//  Pines:
//    PN532 NFC  → SPI: SCK=18, MISO=19, MOSI=23, SS=5
//    Huella     → UART2: RX=16, TX=17
// ============================================================================

#include <SPI.h>
#include <Adafruit_PN532.h>
#include <HardwareSerial.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Preferences.h>

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN
// ─────────────────────────────────────────────────────────────────────────────
const char* WIFI_SSID     = "Mega_2.4G_6F7B";
const char* WIFI_PASSWORD = "7Qk93cRx";
const char* SERVER_URL    = "http://192.168.1.20:3001";
const char* API_KEY       = "axf_esp32_2025";

const unsigned long POLL_INTERVALO_MS = 400;
const unsigned long TIMEOUT_NFC_MS   = 12000;
const unsigned long TIMEOUT_DEDO_MS  = 15000;

// ─────────────────────────────────────────────────────────────────────────────
// PINES
// ─────────────────────────────────────────────────────────────────────────────
#define PN532_SCK   18
#define PN532_MISO  19
#define PN532_MOSI  23
#define PN532_SS     5
#define HUELLA_RX   16
#define HUELLA_TX   17

// ─────────────────────────────────────────────────────────────────────────────
// OBJETOS
// ─────────────────────────────────────────────────────────────────────────────
Adafruit_PN532 nfc(PN532_SS);
HardwareSerial huellaSerial(2);
Preferences    prefs;

// ─────────────────────────────────────────────────────────────────────────────
// ESTADO GLOBAL
// ─────────────────────────────────────────────────────────────────────────────
uint16_t posicionHuella = 1;
bool     tareaActiva    = false;
unsigned long ultimoPoll = 0;

// ─────────────────────────────────────────────────────────────────────────────
// COMANDOS SENSOR HUELLA — IGUAL QUE V3 (probados y funcionando)
// ─────────────────────────────────────────────────────────────────────────────
const uint8_t CMD_GET_IMAGE[]    = { 0xEF,0x01,0xFF,0xFF,0xFF,0xFF,0x01,0x00,0x03,0x01,0x00,0x05 };
const uint8_t CMD_IMG2TZ_1[]     = { 0xEF,0x01,0xFF,0xFF,0xFF,0xFF,0x01,0x00,0x04,0x02,0x01,0x00,0x08 };
const uint8_t CMD_IMG2TZ_2[]     = { 0xEF,0x01,0xFF,0xFF,0xFF,0xFF,0x01,0x00,0x04,0x02,0x02,0x00,0x09 };
const uint8_t CMD_CREATE_MODEL[] = { 0xEF,0x01,0xFF,0xFF,0xFF,0xFF,0x01,0x00,0x03,0x05,0x00,0x09 };
// CMD_SEARCH igual que v3: startPage=0, pageNum=10, checksum=0x18
// (Este es el que funciona con tu sensor físico)
const uint8_t CMD_SEARCH[]       = { 0xEF,0x01,0xFF,0xFF,0xFF,0xFF,0x01,0x00,0x08,0x04,0x01,0x00,0x00,0x00,0x0A,0x00,0x18 };

// ─────────────────────────────────────────────────────────────────────────────
// NVS — persistir posición de huella entre reinicios
// ─────────────────────────────────────────────────────────────────────────────
void cargarPosicionHuella() {
  prefs.begin("axf", false);
  posicionHuella = prefs.getUShort("hpos", 1);
  prefs.end();
  Serial.printf("[NVS] Posición huella: %d\n", posicionHuella);
}

void guardarPosicionHuella() {
  prefs.begin("axf", false);
  prefs.putUShort("hpos", posicionHuella);
  prefs.end();
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS — sensor huella (mismos parámetros que v3)
// ─────────────────────────────────────────────────────────────────────────────
uint8_t enviarComando(const uint8_t* cmd, uint8_t len, uint8_t* resp, int espera = 2000) {
  while (huellaSerial.available()) huellaSerial.read();
  huellaSerial.write(cmd, len);
  unsigned long t = millis();
  int i = 0;
  while (millis() - t < (unsigned long)espera) {
    if (huellaSerial.available()) {
      resp[i++] = huellaSerial.read();
      if (i >= 16) break;
    }
  }
  return (i >= 10) ? resp[9] : 0xFF;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS — NFC
// ─────────────────────────────────────────────────────────────────────────────
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
// HTTP HELPERS
// ─────────────────────────────────────────────────────────────────────────────
bool httpPost(const String& path, const String& body, String* respOut = nullptr) {
  if (WiFi.status() != WL_CONNECTED) return false;
  HTTPClient http;
  http.begin(String(SERVER_URL) + path);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Connection", "close");
  http.setTimeout(8000);
  int code = http.POST(body);
  String resp = http.getString();
  Serial.printf("[HTTP] POST %s → %d | %s\n", path.c_str(), code, resp.c_str());
  if (respOut) *respOut = resp;
  http.end();
  return (code == 200);
}

bool httpGet(const String& path, String& respOut) {
  if (WiFi.status() != WL_CONNECTED) return false;
  HTTPClient http;
  http.begin(String(SERVER_URL) + path);
  http.addHeader("Connection", "close");
  http.setTimeout(8000);
  int code = http.GET();
  respOut = http.getString();
  if (code != 200) Serial.printf("[HTTP] GET %s → %d | %s\n", path.c_str(), code, respOut.c_str());
  http.end();
  return (code == 200);
}

// ─────────────────────────────────────────────────────────────────────────────
// REPORTES AL BACKEND
// ─────────────────────────────────────────────────────────────────────────────
bool reportarEstado(const String& token, const String& paso) {
  StaticJsonDocument<200> doc;
  doc["api_key"]      = API_KEY;
  doc["token_sesion"] = token;
  doc["paso"]         = paso;
  String body;
  serializeJson(doc, body);
  return httpPost("/api/hardware/estado", body);
}

bool reportarError(const String& token, const String& motivo) {
  StaticJsonDocument<200> doc;
  doc["api_key"]      = API_KEY;
  doc["token_sesion"] = token;
  doc["motivo"]       = motivo;
  String body;
  serializeJson(doc, body);
  Serial.printf("[ERROR] %s\n", motivo.c_str());
  return httpPost("/api/hardware/cancelar", body);
}

bool enviarEvento(const String& tipo, const String& valor, const String& token) {
  StaticJsonDocument<256> doc;
  doc["api_key"]      = API_KEY;
  doc["tipo"]         = tipo;
  doc["valor"]        = valor;
  doc["token_sesion"] = token;
  String body;
  serializeJson(doc, body);
  Serial.printf("[EVENTO] tipo=%s valor=%s token=%s\n", tipo.c_str(), valor.c_str(), token.c_str());
  return httpPost("/api/hardware/evento", body);
}

// ─────────────────────────────────────────────────────────────────────────────
// POLLING UNIFICADO — detecta nfc, huella_enroll y huella_leer en un request
// ─────────────────────────────────────────────────────────────────────────────
bool buscarTareaPendiente(String& tokenOut, String& tipoOut) {
  String resp;
  String path = "/api/hardware/siguiente/cualquiera?api_key=" + String(API_KEY);
  if (!httpGet(path, resp)) return false;

  StaticJsonDocument<256> doc;
  if (deserializeJson(doc, resp)) return false;
  if (!(doc["hay"] | false)) return false;

  tokenOut = String(doc["token"] | "");
  tipoOut  = String(doc["tipo"]  | "");
  return (tokenOut.length() > 0 && tipoOut.length() > 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// REGISTRO NFC — igual que v3, funciona
// ─────────────────────────────────────────────────────────────────────────────
void procesarRegistroNFC(const String& token) {
  Serial.println("\n[NFC] Iniciando registro...");
  reportarEstado(token, "acerca_tarjeta");

  uint8_t uid[7];
  uint8_t uidLen = 0;
  bool detectado = nfc.readPassiveTargetID(
    PN532_MIFARE_ISO14443A, uid, &uidLen, (uint16_t)TIMEOUT_NFC_MS
  );

  if (!detectado) {
    Serial.println("[NFC] Timeout");
    reportarError(token, "timeout_nfc");
    return;
  }

  reportarEstado(token, "tarjeta_detectada");
  String uidStr = uidToString(uid, uidLen);
  Serial.println("[NFC] UID: " + uidStr);

  reportarEstado(token, "enviando");
  if (enviarEvento("nfc", uidStr, token)) {
    Serial.println("[NFC] ✓ Registrado");
  } else {
    reportarError(token, "error_red");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// REGISTRO HUELLA — lógica de v3 (probada) + tipo "huella_enroll" del frontend
// ─────────────────────────────────────────────────────────────────────────────
void procesarRegistroHuella(const String& token) {
  Serial.println("\n[HUELLA] Iniciando registro...");
  Serial.printf("[HUELLA] Posición objetivo: %d\n", posicionHuella);
  uint8_t resp[16];

  // ── Toma 1 — mismos timings que v3 ──────────────────────────────────────
  reportarEstado(token, "acerca_dedo_1");
  Serial.println("[HUELLA] Toma 1 — espera dedo...");

  uint8_t code = 0xFF;
  unsigned long t = millis();
  unsigned long ultimoPrint = 0;
  while (code != 0x00 && millis() - t < TIMEOUT_DEDO_MS) {
    code = enviarComando(CMD_GET_IMAGE, sizeof(CMD_GET_IMAGE), resp, 400);
    if (code != 0x00) {
      delay(150);
      // Imprimir progreso cada 3s para que el Serial Monitor muestre actividad
      if (millis() - ultimoPrint > 3000) {
        Serial.printf("[HUELLA] Esperando dedo... (%.0fs / %.0fs)\n",
          (millis() - t) / 1000.0, TIMEOUT_DEDO_MS / 1000.0);
        ultimoPrint = millis();
      }
    }
  }
  if (code != 0x00) {
    Serial.println("[HUELLA] Timeout toma 1");
    reportarError(token, "timeout_dedo_1");
    return;
  }
  Serial.println("[HUELLA] Imagen 1 capturada ✓");

  code = enviarComando(CMD_IMG2TZ_1, sizeof(CMD_IMG2TZ_1), resp);
  Serial.printf("[HUELLA] Img2Tz(1): 0x%02X\n", code);
  if (code != 0x00) {
    reportarError(token, "error_imagen_1");
    return;
  }
  reportarEstado(token, "dedo_1_ok");  // el modal marca check en Toma 1
  delay(600);

  reportarEstado(token, "retira_dedo");
  Serial.println("[HUELLA] Retira el dedo...");
  // Esperar retiro activo (igual que v3: delay fijo de 2500ms)
  delay(2500);

  // ── Toma 2 ──────────────────────────────────────────────────────────────
  reportarEstado(token, "acerca_dedo_2");
  Serial.println("[HUELLA] Toma 2 — espera dedo...");

  code = 0xFF;
  t = millis();
  ultimoPrint = 0;
  while (code != 0x00 && millis() - t < TIMEOUT_DEDO_MS) {
    code = enviarComando(CMD_GET_IMAGE, sizeof(CMD_GET_IMAGE), resp, 400);
    if (code != 0x00) {
      delay(150);
      if (millis() - ultimoPrint > 3000) {
        Serial.printf("[HUELLA] Esperando dedo toma 2... (%.0fs / %.0fs)\n",
          (millis() - t) / 1000.0, TIMEOUT_DEDO_MS / 1000.0);
        ultimoPrint = millis();
      }
    }
  }
  if (code != 0x00) {
    Serial.println("[HUELLA] Timeout toma 2");
    reportarError(token, "timeout_dedo_2");
    return;
  }
  Serial.println("[HUELLA] Imagen 2 capturada ✓");

  code = enviarComando(CMD_IMG2TZ_2, sizeof(CMD_IMG2TZ_2), resp);
  Serial.printf("[HUELLA] Img2Tz(2): 0x%02X\n", code);
  if (code != 0x00) {
    reportarError(token, "error_imagen_2");
    return;
  }
  reportarEstado(token, "dedo_2_ok");  // el modal marca check en Toma 2
  delay(400);

  // ── Crear modelo ─────────────────────────────────────────────────────────
  reportarEstado(token, "creando_modelo");
  code = enviarComando(CMD_CREATE_MODEL, sizeof(CMD_CREATE_MODEL), resp);
  Serial.printf("[HUELLA] CreateModel: 0x%02X\n", code);
  if (code != 0x00) {
    if (code == 0x0A) reportarError(token, "huellas_no_coinciden");
    else              reportarError(token, "error_modelo");
    // No se ejecutó STORE → el slot no fue ocupado, el frontend puede reintentar
    return;
  }

  // ── Guardar en sensor ─────────────────────────────────────────────────────
  reportarEstado(token, "guardando");
  uint8_t storeCmd[15] = {
    0xEF, 0x01, 0xFF, 0xFF, 0xFF, 0xFF,
    0x01, 0x00, 0x06, 0x06, 0x01,
    (uint8_t)(posicionHuella >> 8),
    (uint8_t)(posicionHuella & 0xFF),
    0x00, 0x00
  };
  uint16_t ck = 0;
  for (int i = 6; i < 13; i++) ck += storeCmd[i];
  storeCmd[13] = (uint8_t)(ck >> 8);
  storeCmd[14] = (uint8_t)(ck & 0xFF);

  Serial.printf("[HUELLA] Store en posición %d\n", posicionHuella);
  code = enviarComando(storeCmd, 15, resp);
  Serial.printf("[HUELLA] Store: 0x%02X\n", code);

  if (code != 0x00) {
    reportarError(token, "error_guardado");
    posicionHuella++;
    guardarPosicionHuella();
    return;
  }

  String posicion = String(posicionHuella);
  Serial.println("[HUELLA] ✓ Guardada en posición " + posicion);
  posicionHuella++;
  guardarPosicionHuella();

  // ── Enviar al backend ─────────────────────────────────────────────────────
  // IMPORTANTE: tipo debe ser "huella_enroll" porque así creó el token el frontend
  reportarEstado(token, "enviando");
  if (enviarEvento("huella_enroll", posicion, token)) {
    Serial.println("[HUELLA] ✓ Registrada correctamente");
  } else {
    // La huella está en el sensor pero no en la BD — reportar error de red
    reportarError(token, "error_red");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LECTURA HUELLA — reclamo de recompensas
// CMD_SEARCH igual que v3 (el que funciona con el sensor físico)
// ─────────────────────────────────────────────────────────────────────────────
void procesarLecturaHuella(const String& token) {
  Serial.println("\n[HUELLA] Iniciando lectura para recompensas...");
  reportarEstado(token, "acerca_tarjeta");

  uint8_t resp[16];
  uint8_t code = 0xFF;
  unsigned long t = millis();

  unsigned long ultimoPrintL = 0;
  while (code != 0x00 && millis() - t < TIMEOUT_DEDO_MS) {
    code = enviarComando(CMD_GET_IMAGE, sizeof(CMD_GET_IMAGE), resp, 400);
    if (code != 0x00) {
      delay(150);
      if (millis() - ultimoPrintL > 3000) {
        Serial.printf("[HUELLA] Esperando dedo para recompensa... (%.0fs)\n",
          (millis() - t) / 1000.0);
        ultimoPrintL = millis();
      }
    }
  }
  if (code != 0x00) {
    Serial.println("[HUELLA] Timeout");
    reportarError(token, "timeout_dedo");
    return;
  }

  reportarEstado(token, "tarjeta_detectada");

  code = enviarComando(CMD_IMG2TZ_1, sizeof(CMD_IMG2TZ_1), resp);
  Serial.printf("[HUELLA] Img2Tz: 0x%02X\n", code);
  if (code != 0x00) {
    reportarError(token, "error_imagen");
    return;
  }

  // Buscar en sensor — CMD_SEARCH igual que v3
  code = enviarComando(CMD_SEARCH, sizeof(CMD_SEARCH), resp);
  Serial.printf("[HUELLA] Search: 0x%02X\n", code);

  if (code == 0x00) {
    uint16_t id    = (resp[10] << 8) | resp[11];
    uint16_t score = (resp[12] << 8) | resp[13];
    Serial.printf("[HUELLA] ✓ Encontrada ID=%d Score=%d\n", id, score);
    reportarEstado(token, "enviando");
    if (!enviarEvento("huella_leer", String(id), token)) {
      reportarError(token, "error_red");
    }
  } else if (code == 0x09) {
    Serial.println("[HUELLA] No encontrada (0x09)");
    reportarError(token, "huella_no_encontrada");
  } else {
    Serial.printf("[HUELLA] Error búsqueda: 0x%02X\n", code);
    reportarError(token, "huella_no_encontrada");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// WIFI
// ─────────────────────────────────────────────────────────────────────────────
void reconectarWifi() {
  Serial.println("[WIFI] Reconectando...");
  WiFi.reconnect();
  int n = 0;
  while (WiFi.status() != WL_CONNECTED && n < 20) { delay(500); Serial.print("."); n++; }
  if (WiFi.status() == WL_CONNECTED)
    Serial.println("\n[WIFI] ✓ IP: " + WiFi.localIP().toString());
  else {
    Serial.println("\n[WIFI] Fallo, reintento en 3s");
    delay(3000);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SETUP
// ─────────────────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(600);
  Serial.println("\n================================");
  Serial.println("   AXF GymNet — ESP32 FINAL");
  Serial.println("   (Registro NFC + Huella + Recompensas)");
  Serial.println("================================\n");

  cargarPosicionHuella();

  // WiFi
  Serial.print("[WIFI] Conectando a " + String(WIFI_SSID));
  WiFi.setAutoReconnect(true);
  WiFi.persistent(true);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int n = 0;
  while (WiFi.status() != WL_CONNECTED && n < 24) { delay(500); Serial.print("."); n++; }
  Serial.println(WiFi.status() == WL_CONNECTED
    ? "\n[WIFI] ✓ IP: " + WiFi.localIP().toString()
    : "\n[WIFI] Sin conexión — reintento automático");

  // NFC
  SPI.begin(PN532_SCK, PN532_MISO, PN532_MOSI, PN532_SS);
  nfc.begin();
  uint32_t ver = nfc.getFirmwareVersion();
  if (!ver) {
    Serial.println("[NFC]  ERROR — PN532 no encontrado");
  } else {
    nfc.SAMConfig();
    Serial.printf("[NFC]  ✓ PN5%02x v%d.%d\n",
      (ver >> 24) & 0xFF, (ver >> 16) & 0xFF, (ver >> 8) & 0xFF);
  }

  // Sensor huella
  huellaSerial.begin(57600, SERIAL_8N1, HUELLA_RX, HUELLA_TX);
  delay(500);
  uint8_t testResp[16];
  uint8_t tc = enviarComando(CMD_GET_IMAGE, sizeof(CMD_GET_IMAGE), testResp, 1000);
  Serial.println((tc == 0x02 || tc == 0x00)
    ? "[HUELLA] ✓ Sensor respondiendo"
    : "[HUELLA] ADVERTENCIA — verifica RX=16, TX=17 y alimentación");

  Serial.printf("\n[INFO] Próxima posición huella: %d\n\n", posicionHuella);
}

// ─────────────────────────────────────────────────────────────────────────────
// LOOP — polling unificado sin modo acceso
// ─────────────────────────────────────────────────────────────────────────────
void loop() {
  if (WiFi.status() != WL_CONNECTED) { reconectarWifi(); return; }
  if (tareaActiva) { delay(100); return; }

  unsigned long ahora = millis();
  if (ahora - ultimoPoll < POLL_INTERVALO_MS) { delay(10); return; }
  ultimoPoll = ahora;

  String tokenTarea = "", tipoTarea = "";
  if (!buscarTareaPendiente(tokenTarea, tipoTarea)) return;

  tareaActiva = true;
  Serial.printf("\n[POLL] Tarea: %s | Token: %s\n", tipoTarea.c_str(), tokenTarea.c_str());

  if      (tipoTarea == "nfc")          procesarRegistroNFC(tokenTarea);
  else if (tipoTarea == "huella_enroll" || tipoTarea == "huella")
                                         procesarRegistroHuella(tokenTarea);
  else if (tipoTarea == "huella_leer")   procesarLecturaHuella(tokenTarea);
  else {
    Serial.println("[POLL] Tipo desconocido: " + tipoTarea);
    reportarError(tokenTarea, "tipo_desconocido");
  }

  tareaActiva = false;
  delay(200);
}
