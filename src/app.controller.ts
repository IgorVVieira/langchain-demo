import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ChatService } from 'src/chat.service';

@Controller()
export class AppController {
  constructor(private readonly chatService: ChatService) {}

  @Post('chat')
  async chat(
    @Body('message') message: string,
    @Body('threadId') threadId: string,
  ): Promise<any> {
    return this.chatService.chat(message, threadId);
  }

  @Get('retriever/:retriever')
  async getRetriever(@Param('retriever') retriever: string): Promise<any> {
    return this.chatService.getRetriever(retriever);
  }
}
