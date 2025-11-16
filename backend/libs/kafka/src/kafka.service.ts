import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Kafka,
  Producer,
  Consumer,
  Admin,
  KafkaConfig,
  ProducerConfig,
  ConsumerConfig,
  EachMessagePayload,
  EachBatchPayload,
  Message,
  logLevel,
} from 'kafkajs';
import {
  KafkaProducerOptions,
  KafkaConsumerOptions,
  KafkaMessage,
  KafkaMessageMetadata,
  TopicConfig,
} from './interfaces/kafka-options.interface';

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaService.name);
  private kafka: Kafka;
  private producer: Producer | null = null;
  private consumers: Map<string, Consumer> = new Map();
  private admin: Admin | null = null;
  private isConnected = false;

  constructor(private configService: ConfigService) {
    const brokers = this.configService.get<string>('KAFKA_BROKERS')?.split(',') || ['localhost:9092'];
    const clientId = this.configService.get<string>('KAFKA_CLIENT_ID') || 'metaenix-kafka-client';
    const logLevelConfig = this.configService.get<string>('KAFKA_LOG_LEVEL') || 'WARN';

    const kafkaConfig: KafkaConfig = {
      clientId,
      brokers,
      logLevel: logLevel[logLevelConfig as keyof typeof logLevel] || logLevel.WARN,
      retry: {
        retries: this.configService.get<number>('KAFKA_RETRY_RETRIES') || 8,
        initialRetryTime: this.configService.get<number>('KAFKA_RETRY_INITIAL_TIME') || 100,
        multiplier: this.configService.get<number>('KAFKA_RETRY_MULTIPLIER') || 2,
        maxRetryTime: this.configService.get<number>('KAFKA_RETRY_MAX_TIME') || 30000,
      },
      requestTimeout: this.configService.get<number>('KAFKA_REQUEST_TIMEOUT') || 30000,
      connectionTimeout: this.configService.get<number>('KAFKA_CONNECTION_TIMEOUT') || 3000,
    };

    // Add SSL configuration if provided
    const sslEnabled = this.configService.get<boolean>('KAFKA_SSL_ENABLED') || false;
    if (sslEnabled) {
      kafkaConfig.ssl = {
        rejectUnauthorized: this.configService.get<boolean>('KAFKA_SSL_REJECT_UNAUTHORIZED') ?? true,
        ca: this.configService.get<string>('KAFKA_SSL_CA'),
        cert: this.configService.get<string>('KAFKA_SSL_CERT'),
        key: this.configService.get<string>('KAFKA_SSL_KEY'),
      };
    }

    // Add SASL configuration if provided
    const saslMechanism = this.configService.get<string>('KAFKA_SASL_MECHANISM');
    if (saslMechanism) {
      kafkaConfig.sasl = {
        mechanism: saslMechanism as any,
        username: this.configService.get<string>('KAFKA_SASL_USERNAME') || '',
        password: this.configService.get<string>('KAFKA_SASL_PASSWORD') || '',
      };
    }

    this.kafka = new Kafka(kafkaConfig);
  }

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  // #########################################################
  // CONNECTION MANAGEMENT
  // #########################################################

  /**
   * Connect to Kafka
   */
  private async connect(): Promise<void> {
    try {
      // Create admin client
      this.admin = this.kafka.admin();
      await this.admin.connect();
      this.logger.log('Kafka admin client connected');

      this.isConnected = true;
    } catch (error) {
      this.logger.error('Failed to connect to Kafka:', error);
      throw error;
    }
  }

  /**
   * Disconnect from Kafka
   */
  private async disconnect(): Promise<void> {
    try {
      // Disconnect all consumers
      for (const [groupId, consumer] of this.consumers.entries()) {
        try {
          await consumer.disconnect();
          this.logger.log(`Consumer ${groupId} disconnected`);
        } catch (error) {
          this.logger.error(`Error disconnecting consumer ${groupId}:`, error);
        }
      }
      this.consumers.clear();

      // Disconnect producer
      if (this.producer) {
        await this.producer.disconnect();
        this.logger.log('Producer disconnected');
        this.producer = null;
      }

      // Disconnect admin
      if (this.admin) {
        await this.admin.disconnect();
        this.logger.log('Admin client disconnected');
        this.admin = null;
      }

      this.isConnected = false;
    } catch (error) {
      this.logger.error('Error disconnecting from Kafka:', error);
    }
  }

  /**
   * Check if Kafka is connected
   */
  isKafkaConnected(): boolean {
    return this.isConnected;
  }

  // #########################################################
  // PRODUCER OPERATIONS
  // #########################################################

  /**
   * Get or create producer
   */
  private async getProducer(options?: KafkaProducerOptions): Promise<Producer> {
    if (!this.producer) {
      const producerConfig: ProducerConfig = {
        maxInFlightRequests: options?.maxInFlightRequests || 1,
        idempotent: options?.idempotent ?? true,
        transactionalId: options?.transactionalId,
        retry: options?.retry || {
          retries: 8,
          initialRetryTime: 100,
          multiplier: 2,
          maxRetryTime: 30000,
        },
      };

      this.producer = this.kafka.producer(producerConfig);
      await this.producer.connect();
      this.logger.log('Kafka producer connected');
    }

    return this.producer;
  }

  /**
   * Send a single message
   */
  async sendMessage<T = any>(message: KafkaMessage<T>): Promise<KafkaMessageMetadata> {
    try {
      const producer = await this.getProducer();
      
      const kafkaMessage: Message = {
        key: message.key 
          ? (typeof message.key === 'string' ? Buffer.from(message.key) : message.key)
          : null,
        value: Buffer.from(
          typeof message.value === 'string' 
            ? message.value 
            : JSON.stringify(message.value)
        ),
        headers: message.headers ? this.convertHeaders(message.headers) : undefined,
        timestamp: message.timestamp || Date.now().toString(),
      };

      const result = await producer.send({
        topic: message.topic,
        messages: [kafkaMessage],
        ...(message.partition !== undefined && { partition: message.partition }),
      });

      const metadata = result[0];
      return {
        topic: metadata.topicName,
        partition: metadata.partition,
        offset: metadata.offset || '0',
        timestamp: metadata.timestamp || Date.now().toString(),
        key: message.key,
        headers: message.headers,
      };
    } catch (error) {
      this.logger.error(`Failed to send message to topic ${message.topic}:`, error);
      throw error;
    }
  }

  /**
   * Send multiple messages
   */
  async sendMessages<T = any>(messages: KafkaMessage<T>[]): Promise<KafkaMessageMetadata[]> {
    try {
      const producer = await this.getProducer();

      const kafkaMessages: Message[] = messages.map((message): Message => ({
        key: message.key 
          ? (typeof message.key === 'string' ? Buffer.from(message.key) : message.key)
          : null,
        value: Buffer.from(
          typeof message.value === 'string' 
            ? message.value 
            : JSON.stringify(message.value)
        ),
        headers: message.headers ? this.convertHeaders(message.headers) : undefined,
        timestamp: message.timestamp || Date.now().toString(),
      }));

      // Group messages by topic
      const messagesByTopic = new Map<string, Message[]>();
      const topicPartitions = new Map<string, number | undefined>();

      messages.forEach((message, index) => {
        const topic = message.topic;
        if (!messagesByTopic.has(topic)) {
          messagesByTopic.set(topic, []);
        }
        messagesByTopic.get(topic)!.push(kafkaMessages[index]);
        topicPartitions.set(topic, message.partition);
      });

      const results: KafkaMessageMetadata[] = [];

      // Send messages for each topic
      for (const [topic, topicMessages] of messagesByTopic.entries()) {
        const partition = topicPartitions.get(topic);
        const result = await producer.send({
          topic,
          messages: topicMessages,
          ...(partition !== undefined && { partition }),
        });

        result.forEach((metadata, index) => {
          const originalMessage = messages.find(
            (m) => m.topic === topic && m.partition === partition
          );
          results.push({
            topic: metadata.topicName,
            partition: metadata.partition,
            offset: metadata.offset || '0',
            timestamp: metadata.timestamp || Date.now().toString(),
            key: originalMessage?.key,
            headers: originalMessage?.headers,
          });
        });
      }

      return results;
    } catch (error) {
      this.logger.error('Failed to send messages:', error);
      throw error;
    }
  }

  /**
   * Send message with transaction support
   */
  async sendTransactionalMessage<T = any>(
    transactionalId: string,
    messages: KafkaMessage<T>[]
  ): Promise<KafkaMessageMetadata[]> {
    try {
      const producer = await this.getProducer({ transactionalId });

      const kafkaMessages: Message[] = messages.map((message): Message => ({
        key: message.key 
          ? (typeof message.key === 'string' ? Buffer.from(message.key) : message.key)
          : null,
        value: Buffer.from(
          typeof message.value === 'string' 
            ? message.value 
            : JSON.stringify(message.value)
        ),
        headers: message.headers ? this.convertHeaders(message.headers) : undefined,
        timestamp: message.timestamp || Date.now().toString(),
      }));

      const transaction = await producer.transaction();
      const results: KafkaMessageMetadata[] = [];

      try {
        for (const message of messages) {
          const kafkaMessage = kafkaMessages[messages.indexOf(message)];
          const result = await transaction.send({
            topic: message.topic,
            messages: [kafkaMessage],
            ...(message.partition !== undefined && { partition: message.partition }),
          });

          result.forEach((metadata) => {
            results.push({
              topic: metadata.topicName,
              partition: metadata.partition,
              offset: metadata.offset || '0',
              timestamp: metadata.timestamp || Date.now().toString(),
              key: message.key,
              headers: message.headers,
            });
          });
        }

        await transaction.commit();
        return results;
      } catch (error) {
        await transaction.abort();
        throw error;
      }
    } catch (error) {
      this.logger.error('Failed to send transactional message:', error);
      throw error;
    }
  }

  // #########################################################
  // CONSUMER OPERATIONS
  // #########################################################

  /**
   * Get or create consumer
   */
  private async getConsumer(
    groupId: string,
    options?: KafkaConsumerOptions
  ): Promise<Consumer> {
    if (!this.consumers.has(groupId)) {
      const consumerConfig: ConsumerConfig = {
        groupId,
        allowAutoTopicCreation: options?.allowAutoTopicCreation ?? true,
        sessionTimeout: options?.sessionTimeout || 30000,
        heartbeatInterval: options?.heartbeatInterval || 3000,
        maxBytesPerPartition: options?.maxBytesPerPartition || 1048576,
        minBytes: options?.minBytes || 1,
        maxBytes: options?.maxBytes || 10485760,
        maxWaitTimeInMs: options?.maxWaitTimeInMs || 5000,
        readUncommitted: options?.readUncommitted ?? false,
      };

      const consumer = this.kafka.consumer(consumerConfig);
      await consumer.connect();
      this.logger.log(`Kafka consumer ${groupId} connected`);
      this.consumers.set(groupId, consumer);
    }

    return this.consumers.get(groupId)!;
  }

  /**
   * Subscribe to topic(s) and consume messages
   */
  async subscribe(
    groupId: string,
    topics: string | string[],
    handler: (payload: EachMessagePayload) => Promise<void>,
    options?: KafkaConsumerOptions
  ): Promise<void> {
    try {
      const consumer = await this.getConsumer(groupId, options);
      const topicArray = Array.isArray(topics) ? topics : [topics];

      await consumer.subscribe({
        topics: topicArray,
        fromBeginning: options?.fromBeginning ?? false,
      });

      await consumer.run({
        eachMessage: async (payload) => {
          try {
            await handler(payload);
          } catch (error) {
            this.logger.error(
              `Error processing message from topic ${payload.topic}:`,
              error
            );
            // You might want to implement retry logic or dead letter queue here
          }
        },
      });

      this.logger.log(`Subscribed to topics: ${topicArray.join(', ')}`);
    } catch (error) {
      this.logger.error(`Failed to subscribe to topics:`, error);
      throw error;
    }
  }

  /**
   * Subscribe and consume messages in batches
   */
  async subscribeBatch(
    groupId: string,
    topics: string | string[],
    handler: (payload: EachBatchPayload) => Promise<void>,
    options?: KafkaConsumerOptions & {
      batchSize?: number;
      batchTimeout?: number;
    }
  ): Promise<void> {
    try {
      const consumer = await this.getConsumer(groupId, options);
      const topicArray = Array.isArray(topics) ? topics : [topics];

      await consumer.subscribe({
        topics: topicArray,
        fromBeginning: options?.fromBeginning ?? false,
      });

      await consumer.run({
        eachBatch: async (payload) => {
          try {
            await handler(payload);
          } catch (error) {
            this.logger.error(
              `Error processing batch from topic ${payload.batch.topic}:`,
              error
            );
          }
        },
        eachBatchAutoResolve: true,
      });

      this.logger.log(`Subscribed to topics (batch mode): ${topicArray.join(', ')}`);
    } catch (error) {
      this.logger.error(`Failed to subscribe to topics (batch mode):`, error);
      throw error;
    }
  }

  /**
   * Unsubscribe consumer from topics
   */
  async unsubscribe(groupId: string): Promise<void> {
    try {
      const consumer = this.consumers.get(groupId);
      if (consumer) {
        await consumer.stop();
        await consumer.disconnect();
        this.consumers.delete(groupId);
        this.logger.log(`Consumer ${groupId} unsubscribed`);
      }
    } catch (error) {
      this.logger.error(`Failed to unsubscribe consumer ${groupId}:`, error);
      throw error;
    }
  }

  // #########################################################
  // ADMIN OPERATIONS
  // #########################################################

  /**
   * Create a topic
   */
  async createTopic(topic: string, config?: TopicConfig): Promise<void> {
    try {
      if (!this.admin) {
        this.admin = this.kafka.admin();
        await this.admin.connect();
      }

      await this.admin.createTopics({
        topics: [
          {
            topic,
            numPartitions: config?.numPartitions || 1,
            replicationFactor: config?.replicationFactor || 1,
            configEntries: config?.configEntries,
          },
        ],
      });

      this.logger.log(`Topic ${topic} created`);
    } catch (error) {
      this.logger.error(`Failed to create topic ${topic}:`, error);
      throw error;
    }
  }

  /**
   * Delete a topic
   */
  async deleteTopic(topic: string): Promise<void> {
    try {
      if (!this.admin) {
        this.admin = this.kafka.admin();
        await this.admin.connect();
      }

      await this.admin.deleteTopics({
        topics: [topic],
      });

      this.logger.log(`Topic ${topic} deleted`);
    } catch (error) {
      this.logger.error(`Failed to delete topic ${topic}:`, error);
      throw error;
    }
  }

  /**
   * List all topics
   */
  async listTopics(): Promise<string[]> {
    try {
      if (!this.admin) {
        this.admin = this.kafka.admin();
        await this.admin.connect();
      }

      const topics = await this.admin.listTopics();
      return topics;
    } catch (error) {
      this.logger.error('Failed to list topics:', error);
      throw error;
    }
  }

  /**
   * Get topic metadata
   */
  async getTopicMetadata(topic: string): Promise<any> {
    try {
      if (!this.admin) {
        this.admin = this.kafka.admin();
        await this.admin.connect();
      }

      const metadata = await this.admin.fetchTopicMetadata({ topics: [topic] });
      return metadata.topics.find((t) => t.name === topic);
    } catch (error) {
      this.logger.error(`Failed to get metadata for topic ${topic}:`, error);
      throw error;
    }
  }

  /**
   * Get consumer group offsets
   */
  async getConsumerGroupOffsets(groupId: string): Promise<any> {
    try {
      if (!this.admin) {
        this.admin = this.kafka.admin();
        await this.admin.connect();
      }

      const offsets = await this.admin.fetchOffsets({
        groupId,
      });

      return offsets;
    } catch (error) {
      this.logger.error(`Failed to get offsets for group ${groupId}:`, error);
      throw error;
    }
  }

  /**
   * Reset consumer group offsets
   */
  async resetConsumerGroupOffsets(
    groupId: string,
    topic: string,
    offset: 'earliest' | 'latest'
  ): Promise<void> {
    try {
      if (!this.admin) {
        this.admin = this.kafka.admin();
        await this.admin.connect();
      }

      await this.admin.resetOffsets({
        groupId,
        topic,
        earliest: offset === 'earliest',
      });

      this.logger.log(`Reset offsets for group ${groupId}, topic ${topic}`);
    } catch (error) {
      this.logger.error(`Failed to reset offsets for group ${groupId}:`, error);
      throw error;
    }
  }

  // #########################################################
  // UTILITY METHODS
  // #########################################################

  /**
   * Convert headers to Kafka format
   */
  private convertHeaders(
    headers: Record<string, string | Buffer>
  ): Record<string, Buffer> {
    const converted: Record<string, Buffer> = {};
    for (const [key, value] of Object.entries(headers)) {
      converted[key] = typeof value === 'string' ? Buffer.from(value) : value;
    }
    return converted;
  }

  /**
   * Parse message value
   */
  parseMessageValue<T = any>(value: Buffer | string): T {
    try {
      const stringValue = Buffer.isBuffer(value) ? value.toString() : value;
      return JSON.parse(stringValue) as T;
    } catch {
      return value as T;
    }
  }

  /**
   * Get Kafka instance (for advanced usage)
   */
  getKafka(): Kafka {
    return this.kafka;
  }

  /**
   * Get producer instance
   */
  getProducerInstance(): Producer | null {
    return this.producer;
  }

  /**
   * Get consumer instance
   */
  getConsumerInstance(groupId: string): Consumer | null {
    return this.consumers.get(groupId) || null;
  }
}
