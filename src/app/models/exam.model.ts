import { Class } from './class.model';

export interface ExamSubject {
  name: string;
  maxMarks: number;
}

export interface Exam {
  _id: string;
  name: string;
  class: string | Class;
  group?: string;
  subjects: ExamSubject[];
  academicYear: string;
}