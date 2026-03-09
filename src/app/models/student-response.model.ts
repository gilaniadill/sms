import { Student } from "./student.model";

export interface StudentResponseModel 
{
    success: boolean;
    count: number;
    data: Student[];
    message?: string;
}
