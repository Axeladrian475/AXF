/**
 * Calcula TMB, TDEE y rangos de macronutrientes.
 * @param {object} datos - { peso_kg, altura_cm, edad, sexo, actividad }
 * @returns {object} - { tmb, tdee, proteinas, grasas, carbs }
 */
export function calcularMacros({ peso_kg, altura_cm, edad, sexo, actividad }) {
  if (!peso_kg || !altura_cm || !edad || !sexo || !actividad) return null;

  // Fórmula Mifflin-St Jeor
  let tmb;
  if (sexo === 'M') {
    tmb = 10 * peso_kg + 6.25 * altura_cm - 5 * edad + 5;
  } else {
    tmb = 10 * peso_kg + 6.25 * altura_cm - 5 * edad - 161;
  }

  // Multiplicadores de actividad
  const factores = {
    Sedentario:             1.2,
    Ligeramente_Activo:     1.375,
    Moderadamente_Activo:   1.55,
    Muy_Activo:             1.725,
    Extremadamente_Activo:  1.9,
  };
  const tdee = tmb * (factores[actividad] || 1.2);

  // Rangos de macros según OMS y actividad
  const esMuyActivo = ['Muy_Activo','Extremadamente_Activo'].includes(actividad);
  const protMin = esMuyActivo ? peso_kg * 1.6 : peso_kg * 1.2;
  const protMax = esMuyActivo ? peso_kg * 2.2 : peso_kg * 1.8;

  // Grasas: 25-35% del TDEE (9 kcal por gramo)
  const grasaMin = (tdee * 0.25) / 9;
  const grasaMax = (tdee * 0.35) / 9;

  // Carbohidratos: resto de calorías (4 kcal por gramo)
  const calosProt   = protMax * 4;
  const calosGrasa  = grasaMax * 9;
  const carbsMin = ((tdee - calosProt - calosGrasa) * 0.85) / 4;
  const carbsMax = ((tdee - calosProt - calosGrasa) * 1.15) / 4;

  return {
    tmb:          Math.round(tmb),
    tdee:         Math.round(tdee),
    proteinas:    { min: Math.round(protMin),  max: Math.round(protMax) },
    grasas:       { min: Math.round(grasaMin), max: Math.round(grasaMax) },
    carbs:        { min: Math.round(carbsMin), max: Math.round(carbsMax) },
};
}
