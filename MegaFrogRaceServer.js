// Example Realtime Server Script
// リアルタイムスクリプトの例
'use strict';

// Example override configuration
// Configuratinの例
const configuration = {
    pingIntervalTime: 30000,
    maxPlayers: 32
};

// Timing mechanism used to trigger end of game session. Defines how long, in milliseconds, between each tick in the example tick loop
// ゲームセッションの終了をトリガーするために使用されるタイミングメカニズム。
// 例のティックループの各ティック間の長さをミリ秒単位で定義します
// 1秒
const tickTime = 1000;

// Defines how to long to wait in Seconds before beginning early termination check in the example tick loop
// 早期終了チェックを開始する時間の長さを秒で指定する
const minimumElapsedTime = 120;

var session;                        // The Realtime server session object
var logger;                         // Log at appropriate level via .info(), .warn(), .error(), .debug()
var startTime;                      // Records the time the process started
var activePlayers = 0;              // Records the number of connected players
var onProcessStartedCalled = false; // Record if onProcessStarted has been called

// Example custom op codes for user-defined messages
// Any positive op code number can be defined here. These should match your client code.
// ユーザー定義メッセージのカスタム操作コードの例
// ここでは任意の正のオペコード番号を定義できます。これらはクライアントコードと一致する必要があります。
const OP_CODE_CUSTOM_OP1 = 111;
const OP_CODE_CUSTOM_OP1_REPLY = 112;
const OP_CODE_PLAYER_ACCEPTED = 113;
const OP_CODE_DISCONNECT_NOTIFICATION = 114;

// Example groups for user-defined groups
// Any positive group number can be defined here. These should match your client code.
// When referring to user-defined groups, "-1" represents all groups, "0" is reserved.
// ユーザー定義グループのグループ例
// ここでは任意の正のグループ番号を定義できます。これらはクライアントコードと一致する必要があります。
// ユーザー定義グループを参照する場合、「-1」はすべてのグループを表し、「0」は予約されています。
const RED_TEAM_GROUP = 1;
const BLUE_TEAM_GROUP = 2;

// Called when game server is initialized, passed server's object of current session
// ゲームサーバーの初期化時に呼ばれる。
function init(rtSession) {
    session = rtSession;
    logger = session.getLogger();
}

// On Process Started is called when the process has begun and we need to perform any
// bootstrapping.  This is where the developer should insert any code to prepare
// the process to be able to host a game session, for example load some settings or set state
//
// Return true if the process has been appropriately prepared and it is okay to invoke the
// GameLift ProcessReady() call.
// On Process Startedは、プロセスが開始されたときに呼び出され、次のいずれかを実行する必要があります
//ブートストラップ。これは、開発者が準備するコードを挿入する必要がある場所です
//ゲームセッションをホストできるようにするプロセス。たとえば、いくつかの設定を読み込んだり、状態を設定したりします
//
//プロセスが適切に準備されていて、呼び出しても問題がない場合はtrueを返します
// GameLift ProcessReady（）呼び出し。
function onProcessStarted(args) {
    onProcessStartedCalled = true;
    logger.info("Starting process with args: " + args);
    logger.info("Ready to host games...");

    return true;
}

// Called when a new game session is started on the process
// プロセスで新しいゲームセッションが開始されたときに呼び出されます
function onStartGameSession(gameSession) {
    // Complete any game session set-up

    // Set up an example tick loop to perform server initiated actions
    // サーバーが開始するアクションを実行するためのティックループの例を設定します
    startTime = getTimeInS();
    tickLoop();
}

// Handle process termination if the process is being terminated by GameLift
// You do not need to call ProcessEnding here
// プロセスがGameLiftによって終了されている場合は、プロセスの終了を処理します
// ここでProcessEndingを呼び出す必要はありません
function onProcessTerminate() {
    // Perform any clean up
}

// Return true if the process is healthy
// プロセスが正常な場合はtrueを返します
function onHealthCheck() {
    return true;
}

// On Player Connect is called when a player has passed initial validation
// Return true if player should connect, false to reject
// On Player Connectは、プレーヤーが初期検証に合格したときに呼び出されます
// プレーヤーが接続する必要がある場合はtrueを返し、拒否する場合はfalseを返します
function onPlayerConnect(connectMsg) {
    // Perform any validation needed for connectMsg.payload, connectMsg.peerId
    // connectMsg.payload、connectMsg.peerIdに必要な検証を実行します
    return true;
}

// Called when a Player is accepted into the game
// GGGGGGGGGGGFFFプレーヤーがゲームに受け入れられたときに呼び出されます
function onPlayerAccepted(player) {
    // This player was accepted -- let's send them a message
    const msg = session.newTextGameMessage(OP_CODE_PLAYER_ACCEPTED, player.peerId,
                                             "Peer " + player.peerId + " accepted");
    session.sendReliableMessage(msg, player.peerId);
    activePlayers++;
}

// On Player Disconnect is called when a player has left or been forcibly terminated
// Is only called for players that actually connected to the server and not those rejected by validation
// This is called before the player is removed from the player list
// プレイヤーが離れたとき、または強制的に終了したときに、On PlayerDisconnectが呼び出されます
// サーバーに実際に接続しているプレーヤーに対してのみ呼び出され、検証によって拒否されたプレーヤーに対しては呼び出されません
// これは、プレーヤーがプレーヤーリストから削除される前に呼び出されます
function onPlayerDisconnect(peerId) {
    // send a message to each remaining player letting them know about the disconnect
    const outMessage = session.newTextGameMessage(OP_CODE_DISCONNECT_NOTIFICATION,
                                                session.getServerId(),
                                                "Peer " + peerId + " disconnected");
    session.getPlayers().forEach((player, playerId) => {
        if (playerId != peerId) {
            session.sendReliableMessage(outMessage, peerId);
        }
    });
    activePlayers--;
}

// Handle a message to the server
//サーバーへのメッセージを処理します
function onMessage(gameMessage) {
    switch (gameMessage.opCode) {
      case OP_CODE_CUSTOM_OP1: {
        // do operation 1 with gameMessage.payload for example sendToGroup
        const outMessage = session.newTextGameMessage(OP_CODE_CUSTOM_OP1_REPLY, session.getServerId(), gameMessage.payload);
        session.sendGroupMessage(outMessage, RED_TEAM_GROUP);
        break;
      }
    }
}

// Return true if the send should be allowed
function onSendToPlayer(gameMessage) {
    // This example rejects any payloads containing "Reject"
    return (!gameMessage.getPayloadAsText().includes("Reject"));
}

// Return true if the send to group should be allowed
// Use gameMessage.getPayloadAsText() to get the message contents
function onSendToGroup(gameMessage) {
    return true;
}

// Return true if the player is allowed to join the group
function onPlayerJoinGroup(groupId, peerId) {
    return true;
}

// Return true if the player is allowed to leave the group
function onPlayerLeaveGroup(groupId, peerId) {
    return true;
}

// A simple tick loop example
// Checks to see if a minimum amount of time has passed before seeing if the game has ended
async function tickLoop() {
    const elapsedTime = getTimeInS() - startTime;
    logger.info("Tick... " + elapsedTime + " activePlayers: " + activePlayers);

    // In Tick loop - see if all players have left early after a minimum period of time has passed
    // Call processEnding() to terminate the process and quit
    if ( (activePlayers == 0) && (elapsedTime > minimumElapsedTime)) {
        logger.info("All players disconnected. Ending game");
        const outcome = await session.processEnding();
        logger.info("Completed process ending with: " + outcome);
        process.exit(0);
    }
    else {
        setTimeout(tickLoop, tickTime);
    }
}

// Calculates the current time in seconds
function getTimeInS() {
    return Math.round(new Date().getTime()/1000);
}

exports.ssExports = {
    configuration: configuration,
    init: init,
    onProcessStarted: onProcessStarted,
    onMessage: onMessage,
    onPlayerConnect: onPlayerConnect,
    onPlayerAccepted: onPlayerAccepted,
    onPlayerDisconnect: onPlayerDisconnect,
    onSendToPlayer: onSendToPlayer,
    onSendToGroup: onSendToGroup,
    onPlayerJoinGroup: onPlayerJoinGroup,
    onPlayerLeaveGroup: onPlayerLeaveGroup,
    onStartGameSession: onStartGameSession,
    onProcessTerminate: onProcessTerminate,
    onHealthCheck: onHealthCheck
};