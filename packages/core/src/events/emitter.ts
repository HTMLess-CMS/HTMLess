import { EventEmitter } from 'events';

export type HtmlessEvent =
  | 'entry.created'
  | 'entry.draftSaved'
  | 'entry.published'
  | 'entry.unpublished'
  | 'entry.deleted'
  | 'asset.created'
  | 'asset.updated'
  | 'asset.deleted'
  | 'schema.typeCreated'
  | 'schema.typeUpdated'
  | 'schema.typeDeleted'
  | 'user.login';

export interface EventPayload {
  eventType: HtmlessEvent;
  spaceId: string;
  userId?: string;
  data: Record<string, unknown>;
  occurredAt: string;
}

class HtmlessEventBus extends EventEmitter {
  emit(event: HtmlessEvent, payload: Omit<EventPayload, 'eventType' | 'occurredAt'>): boolean {
    return super.emit(event, {
      ...payload,
      eventType: event,
      occurredAt: new Date().toISOString(),
    } satisfies EventPayload);
  }

  on(event: HtmlessEvent, listener: (payload: EventPayload) => void): this {
    return super.on(event, listener);
  }
}

export const eventBus = new HtmlessEventBus();
