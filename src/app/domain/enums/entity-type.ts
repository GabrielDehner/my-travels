/**
 * Discriminator for `EntityRef`, letting a Document/Notification attach
 * generically to any addressable domain entity (design §2, §5).
 */
export type EntityType =
  | 'travel'
  | 'destination'
  | 'hotel'
  | 'transport'
  | 'document'
  | 'expense'
  | 'checklist'
  | 'checklistItem'
  | 'notification';
