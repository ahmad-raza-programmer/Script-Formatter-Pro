export type ScriptItemType = 'section' | 'dialogue';

export interface SectionHeader {
  type: 'section';
  title: string;
  number: number;
  originalIndex: number;
}

export interface DialogueLine {
  type: 'dialogue';
  speaker: 1 | 2;
  text: string;
  originalIndex: number;
}

export type ScriptItem = SectionHeader | DialogueLine;

export interface ScriptSummary {
  speaker1Lines: number;
  speaker2Lines: number;
  sections: number;
}
