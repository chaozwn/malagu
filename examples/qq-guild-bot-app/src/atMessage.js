const { add } = require('./utils/add');

console.log('[AT_MESSAGES] 事件接收 :', context, add(1,1));
const msg = context.msg;
client.messageApi.postMessage(msg.channel_id, {
    content: `<@!${msg.author.id}> hi 收到你的消息啦`,
    msg_id: msg.id,
}); 

await Promise.resolve();

