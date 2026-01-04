
export interface Medication {
  id: string;
  name: string;
  patientName: string;
  dosage: string;
  time: string;
  notes?: string;
}

export enum AppFeature {
  OBJECT_RECOGNITION = 'objects',
  SPEECH_TO_TEXT = 'stt',
  TEXT_TO_SPEECH = 'tts',
  OCR_SCANNER = 'ocr',
  MEDICINE_PLANNER = 'medicine'
}
