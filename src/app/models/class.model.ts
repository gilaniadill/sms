export interface Subject {
  name: string;
  maxMarks: number;
}

export interface Group {
  _id?: string;
  name: string;
  subjects: Subject[];
}

export interface Class {
  _id: string;
  className: string;
  sections: string[];
  groups: Group[];
}