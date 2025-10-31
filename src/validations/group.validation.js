import z from 'zod';
import { partial } from "zod/mini";

export const createGroupSchema = z.object({
    name: z.string().min(1, "Group name is required"),
    member_emails: z.array(z.email("Invalid email format")),
});

export const updateGroupSchema = partial(createGroupSchema);



