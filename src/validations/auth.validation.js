
import z from 'zod';

export const signupSchema = z.object({
    username: z.string().min(3).max(30),
    email: z.email(),
    password: z.string().min(6),
    fullname: z.string().min(3),
    phone_number: z.string().optional(),
    address: z.string().min(1).optional(),
    profile_picture: z.url().optional(),
});
