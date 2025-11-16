export interface KafkaProducerOptions {
  /**
   * Maximum number of messages to batch
   */
  maxInFlightRequests?: number;

  /**
   * Idempotent producer (prevents duplicates)
   */
  idempotent?: boolean;

  /**
   * Transactional producer
   */
  transactionalId?: string;

  /**
   * Compression codec (none, gzip, snappy, lz4, zstd)
   */
  compression?: 'none' | 'gzip' | 'snappy' | 'lz4' | 'zstd';

  /**
   * Retry configuration
   */
  retry?: {
    retries?: number;
    initialRetryTime?: number;
    multiplier?: number;
    maxRetryTime?: number;
  };
}

export interface KafkaConsumerOptions {
  /**
   * Consumer group ID
   */
  groupId: string;

  /**
   * Whether to allow auto-creation of topics
   */
  allowAutoTopicCreation?: boolean;

  /**
   * Session timeout in milliseconds
   */
  sessionTimeout?: number;

  /**
   * Heartbeat interval in milliseconds
   */
  heartbeatInterval?: number;

  /**
   * Maximum bytes per partition
   */
  maxBytesPerPartition?: number;

  /**
   * Minimum bytes to fetch
   */
  minBytes?: number;

  /**
   * Maximum bytes to fetch
   */
  maxBytes?: number;

  /**
   * Maximum wait time in milliseconds
   */
  maxWaitTimeInMs?: number;

  /**
   * From beginning (read from oldest messages)
   */
  fromBeginning?: boolean;

  /**
   * Read from earliest offset
   */
  readUncommitted?: boolean;
}

export interface KafkaMessage<T = any> {
  topic: string;
  partition?: number;
  key?: string | Buffer;
  value: T;
  headers?: Record<string, string | Buffer>;
  timestamp?: string;
}

export interface KafkaMessageMetadata {
  topic: string;
  partition: number;
  offset: string;
  timestamp: string;
  key?: string | Buffer;
  headers?: Record<string, string | Buffer>;
}

export interface TopicConfig {
  /**
   * Number of partitions
   */
  numPartitions?: number;

  /**
   * Replication factor
   */
  replicationFactor?: number;

  /**
   * Topic configuration entries
   */
  configEntries?: Array<{ name: string; value: string }>;
}

