import db from './config/database.js';

async function main() {
  try {
    console.log("Añadiendo columna fecha...");
    await db.query("ALTER TABLE registro_entrenamiento ADD COLUMN fecha DATE NOT NULL DEFAULT (CURRENT_DATE);");
    console.log("Columna añadida con éxito.");
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') console.log("Columna fecha ya existe.");
    else console.error("Error añadiendo fecha:", err);
  }

  try {
    console.log("Añadiendo índice único...");
    await db.query("ALTER TABLE registro_entrenamiento ADD UNIQUE KEY uq_registro_serie (id_rutina_ejercicio, num_serie, fecha);");
    console.log("Índice añadido con éxito.");
  } catch (err) {
    if (err.code === 'ER_DUP_KEYNAME') console.log("Índice ya existe.");
    else console.error("Error añadiendo índice:", err);
  }

  process.exit(0);
}

main();
