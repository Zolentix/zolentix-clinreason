export const SAMPLE_CASES = [
  {
    id: 'chest-pain',
    label: { en: 'Chest pain (red-flag)', fr: 'Douleur thoracique', it: 'Dolore toracico' },
    text: '58-year-old man, 2 hours of central chest pain radiating to the left arm, sweating and short of breath. History of smoking and high cholesterol. Takes simvastatin.',
  },
  {
    id: 'gi-bleed',
    label: { en: 'GI bleed + warfarin', fr: 'Hémorragie GI + warfarine', it: 'Emorragia GI + warfarin' },
    text: '72-year-old woman on warfarin for atrial fibrillation, now with black tarry stools and dizziness for a day. Her GP just started her on ibuprofen for knee pain. BP 100/60, HR 104.',
  },
  {
    id: 'headache-fr',
    label: { en: 'Thunderclap headache (FR)', fr: 'Céphalée en coup de tonnerre', it: 'Cefalea a rombo di tuono (FR)' },
    text: "Femme de 30 ans, céphalée brutale 'en coup de tonnerre', la pire de sa vie, avec raideur de la nuque et photophobie.",
  },
] as const;
