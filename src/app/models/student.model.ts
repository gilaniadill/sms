export interface Student 
{
    _id: string;
    admissionNo: string;


     firstName: string;
     lastName: string;
     fatherName: string;

    dateOfBirth: string;
    gender: 'Male' | 'Female' | 'Other';

    email?: string;
    phone?: string;
    student_status: 'Regular' | 'Private' | 'Other';
    address?: string;

   class: {
    _id: string;
    className: string;
    sections: string[];
  };
    section: string;
    academicYear: string;
    cnic: string;


    photo?: string;
}
