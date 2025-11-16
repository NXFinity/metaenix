import { SetMetadata } from '@nestjs/common';

export const KAFKA_MESSAGE_HANDLER_KEY = 'kafka:message-handler';
export const KAFKA_TOPIC_KEY = 'kafka:topic';
export const KAFKA_GROUP_ID_KEY = 'kafka:group-id';

export interface MessageHandlerOptions {
  /**
   * Topic to subscribe to
   */
  topic: string;

  /**
   * Consumer group ID
   */
  groupId?: string;

  /**
   * Partition to consume from (optional, consumes from all if not specified)
   */
  partition?: number;

  /**
   * Whether to read from beginning
   */
  fromBeginning?: boolean;
}

/**
 * Kafka message handler decorator
 * @param options Handler options
 */
export const KafkaMessageHandler = (options: MessageHandlerOptions) => {
  return SetMetadata(KAFKA_MESSAGE_HANDLER_KEY, options);
};

/**
 * Kafka topic decorator
 * @param topic Topic name
 */
export const KafkaTopic = (topic: string) => {
  return SetMetadata(KAFKA_TOPIC_KEY, topic);
};

/**
 * Kafka group ID decorator
 * @param groupId Consumer group ID
 */
export const KafkaGroupId = (groupId: string) => {
  return SetMetadata(KAFKA_GROUP_ID_KEY, groupId);
};

