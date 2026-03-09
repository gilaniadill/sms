import { Exam } from './exam.model';
import { Student } from './student.model';

export interface Result {
  _id?: string;
  exam: Exam | string;
  student: Student | string;
  marks: { [subject: string]: number };
  total?: number;
  percentage?: number;
  grade?: string;
}