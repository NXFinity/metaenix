import { SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';

@WebSocketGateway()
export class SharesGateway {
  @SubscribeMessage('message')
  handleMessage(_client: any, _payload: any): string {
    return 'Hello world!';
  }
}
