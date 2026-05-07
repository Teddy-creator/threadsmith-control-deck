import { z } from "zod";

export const projectBriefSchema = z.object({
  projectGoal: z.string().min(1),
  currentVersionScope: z.string().min(1),
  nonGoals: z.array(z.string().min(1)),
  keyConstraints: z.array(z.string().min(1)),
  successFrame: z.string().min(1),
  priorityOrder: z.array(z.string().min(1)),
  openStrategicQuestions: z.array(z.string().min(1)).max(3)
});

export type ProjectBrief = z.infer<typeof projectBriefSchema>;
