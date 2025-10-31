
import z from 'zod';
import { partial } from "zod/mini";

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId");

export const addExpenseSchema = z.object({
    paid_by: objectIdSchema,
    split_between: z.array(objectIdSchema),
    expense_title: z.string().min(1, "Expense title is required"),
    amount: z.number().positive("Amount must be a positive number"),
});

export const updateExpenseSchema = partial(addExpenseSchema);



