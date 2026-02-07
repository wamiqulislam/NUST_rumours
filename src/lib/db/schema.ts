import { mysqlTable, varchar, text, timestamp, decimal, int, primaryKey, index, mysqlEnum } from 'drizzle-orm/mysql-core';
import { relations } from 'drizzle-orm';

// Rumor status enum
export const rumorStatusEnum = mysqlEnum('status', ['open', 'verified', 'disputed', 'deleted']);

// Rumors table
export const rumors = mysqlTable('rumors', {
  rumorId: varchar('rumor_id', { length: 36 }).primaryKey(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
  truthScore: decimal('truth_score', { precision: 5, scale: 4 }).default('0.5000').notNull(),
  status: rumorStatusEnum.default('open').notNull(),
  voteCount: int('vote_count').default(0).notNull(),
  totalCredibilityWeight: decimal('total_credibility_weight', { precision: 10, scale: 4 }).default('0.0000').notNull(),
  weightedVoteSum: decimal('weighted_vote_sum', { precision: 10, scale: 4 }).default('0.0000').notNull(),
  lockedAt: timestamp('locked_at'),
}, (table) => [
  index('idx_status').on(table.status),
  index('idx_truth_score').on(table.truthScore),
  index('idx_created_at').on(table.createdAt),
]);

// Anonymous users table (no identifying information stored)
export const anonymousUsers = mysqlTable('anonymous_users', {
  userToken: varchar('user_token', { length: 64 }).primaryKey(), // SHA-256 hash
  credibility: decimal('credibility', { precision: 5, scale: 4 }).default('0.5000').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastActivity: timestamp('last_activity').defaultNow().onUpdateNow(),
  totalVotes: int('total_votes').default(0).notNull(),
  correctVotes: int('correct_votes').default(0).notNull(),
});

// Votes table with hash-based uniqueness
export const votes = mysqlTable('votes', {
  voteHash: varchar('vote_hash', { length: 64 }).primaryKey(), // hash(rumor_id || user_token || salt)
  rumorId: varchar('rumor_id', { length: 36 }).notNull(),
  voteValue: int('vote_value').notNull(), // +1 for verify, -1 for dispute
  voterCredibility: decimal('voter_credibility', { precision: 5, scale: 4 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_rumor_id').on(table.rumorId),
]);

// Comments table
export const comments = mysqlTable('comments', {
  commentId: varchar('comment_id', { length: 36 }).primaryKey(),
  rumorId: varchar('rumor_id', { length: 36 }).notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_comment_rumor').on(table.rumorId),
]);

// Rumor references (DAG edges)
export const rumorReferences = mysqlTable('rumor_references', {
  sourceRumorId: varchar('source_rumor_id', { length: 36 }).notNull(),
  targetRumorId: varchar('target_rumor_id', { length: 36 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.sourceRumorId, table.targetRumorId] }),
  index('idx_source').on(table.sourceRumorId),
  index('idx_target').on(table.targetRumorId),
]);

// Pending credibility updates (processed when rumors lock)
export const pendingCredibilityUpdates = mysqlTable('pending_credibility_updates', {
  id: int('id').primaryKey().autoincrement(),
  userToken: varchar('user_token', { length: 64 }).notNull(),
  rumorId: varchar('rumor_id', { length: 36 }).notNull(),
  voteValue: int('vote_value').notNull(),
  processed: int('processed').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_pending_user').on(table.userToken),
  index('idx_pending_rumor').on(table.rumorId),
]);

// Rate limiting table
export const rateLimits = mysqlTable('rate_limits', {
  userToken: varchar('user_token', { length: 64 }).primaryKey(),
  hourlyVotes: int('hourly_votes').default(0).notNull(),
  dailyVotes: int('daily_votes').default(0).notNull(),
  lastVoteAt: timestamp('last_vote_at').defaultNow(),
  hourResetAt: timestamp('hour_reset_at').defaultNow(),
  dayResetAt: timestamp('day_reset_at').defaultNow(),
});

// Relations
export const rumorsRelations = relations(rumors, ({ many }) => ({
  votes: many(votes),
  comments: many(comments),
  outgoingRefs: many(rumorReferences, { relationName: 'source' }),
  incomingRefs: many(rumorReferences, { relationName: 'target' }),
}));

export const votesRelations = relations(votes, ({ one }) => ({
  rumor: one(rumors, {
    fields: [votes.rumorId],
    references: [rumors.rumorId],
  }),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  rumor: one(rumors, {
    fields: [comments.rumorId],
    references: [rumors.rumorId],
  }),
}));

export const rumorReferencesRelations = relations(rumorReferences, ({ one }) => ({
  source: one(rumors, {
    fields: [rumorReferences.sourceRumorId],
    references: [rumors.rumorId],
    relationName: 'source',
  }),
  target: one(rumors, {
    fields: [rumorReferences.targetRumorId],
    references: [rumors.rumorId],
    relationName: 'target',
  }),
}));

// Type exports
export type Rumor = typeof rumors.$inferSelect;
export type NewRumor = typeof rumors.$inferInsert;
export type AnonymousUser = typeof anonymousUsers.$inferSelect;
export type Vote = typeof votes.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type RumorReference = typeof rumorReferences.$inferSelect;
