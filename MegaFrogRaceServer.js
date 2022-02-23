// Example Realtime Server Script
// ���A���^�C���X�N���v�g�̗�
'use strict';

// Example override configuration
// Configuratin�̗�
const configuration = {
    pingIntervalTime: 30000,
    maxPlayers: 32
};

// Timing mechanism used to trigger end of game session. Defines how long, in milliseconds, between each tick in the example tick loop
// �Q�[���Z�b�V�����̏I�����g���K�[���邽�߂Ɏg�p�����^�C�~���O���J�j�Y���B
// ��̃e�B�b�N���[�v�̊e�e�B�b�N�Ԃ̒������~���b�P�ʂŒ�`���܂�
// 1�b
const tickTime = 1000;

// Defines how to long to wait in Seconds before beginning early termination check in the example tick loop
// �����I���`�F�b�N���J�n���鎞�Ԃ̒�����b�Ŏw�肷��
const minimumElapsedTime = 120;

var session;                        // The Realtime server session object
var logger;                         // Log at appropriate level via .info(), .warn(), .error(), .debug()
var startTime;                      // Records the time the process started
var activePlayers = 0;              // Records the number of connected players
var onProcessStartedCalled = false; // Record if onProcessStarted has been called

// Example custom op codes for user-defined messages
// Any positive op code number can be defined here. These should match your client code.
// ���[�U�[��`���b�Z�[�W�̃J�X�^������R�[�h�̗�
// �����ł͔C�ӂ̐��̃I�y�R�[�h�ԍ����`�ł��܂��B�����̓N���C�A���g�R�[�h�ƈ�v����K�v������܂��B
const OP_CODE_CUSTOM_OP1 = 111;
const OP_CODE_CUSTOM_OP1_REPLY = 112;
const OP_CODE_PLAYER_ACCEPTED = 113;
const OP_CODE_DISCONNECT_NOTIFICATION = 114;

// Example groups for user-defined groups
// Any positive group number can be defined here. These should match your client code.
// When referring to user-defined groups, "-1" represents all groups, "0" is reserved.
// ���[�U�[��`�O���[�v�̃O���[�v��
// �����ł͔C�ӂ̐��̃O���[�v�ԍ����`�ł��܂��B�����̓N���C�A���g�R�[�h�ƈ�v����K�v������܂��B
// ���[�U�[��`�O���[�v���Q�Ƃ���ꍇ�A�u-1�v�͂��ׂẴO���[�v��\���A�u0�v�͗\�񂳂�Ă��܂��B
const RED_TEAM_GROUP = 1;
const BLUE_TEAM_GROUP = 2;

// Called when game server is initialized, passed server's object of current session
// �Q�[���T�[�o�[�̏��������ɌĂ΂��B
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
// On Process Started�́A�v���Z�X���J�n���ꂽ�Ƃ��ɌĂяo����A���̂����ꂩ�����s����K�v������܂�
//�u�[�g�X�g���b�v�B����́A�J���҂���������R�[�h��}������K�v������ꏊ�ł�
//�Q�[���Z�b�V�������z�X�g�ł���悤�ɂ���v���Z�X�B���Ƃ��΁A�������̐ݒ��ǂݍ��񂾂�A��Ԃ�ݒ肵���肵�܂�
//
//�v���Z�X���K�؂ɏ�������Ă��āA�Ăяo���Ă���肪�Ȃ��ꍇ��true��Ԃ��܂�
// GameLift ProcessReady�i�j�Ăяo���B
function onProcessStarted(args) {
    onProcessStartedCalled = true;
    logger.info("Starting process with args: " + args);
    logger.info("Ready to host games...");

    return true;
}

// Called when a new game session is started on the process
// �v���Z�X�ŐV�����Q�[���Z�b�V�������J�n���ꂽ�Ƃ��ɌĂяo����܂�
function onStartGameSession(gameSession) {
    // Complete any game session set-up

    // Set up an example tick loop to perform server initiated actions
    // �T�[�o�[���J�n����A�N�V���������s���邽�߂̃e�B�b�N���[�v�̗��ݒ肵�܂�
    startTime = getTimeInS();
    tickLoop();
}

// Handle process termination if the process is being terminated by GameLift
// You do not need to call ProcessEnding here
// �v���Z�X��GameLift�ɂ���ďI������Ă���ꍇ�́A�v���Z�X�̏I�����������܂�
// ������ProcessEnding���Ăяo���K�v�͂���܂���
function onProcessTerminate() {
    // Perform any clean up
}

// Return true if the process is healthy
// �v���Z�X������ȏꍇ��true��Ԃ��܂�
function onHealthCheck() {
    return true;
}

// On Player Connect is called when a player has passed initial validation
// Return true if player should connect, false to reject
// On Player Connect�́A�v���[���[���������؂ɍ��i�����Ƃ��ɌĂяo����܂�
// �v���[���[���ڑ�����K�v������ꍇ��true��Ԃ��A���ۂ���ꍇ��false��Ԃ��܂�
function onPlayerConnect(connectMsg) {
    // Perform any validation needed for connectMsg.payload, connectMsg.peerId
    // connectMsg.payload�AconnectMsg.peerId�ɕK�v�Ȍ��؂����s���܂�
    return true;
}

// Called when a Player is accepted into the game
// GGGGGGGGGGGFFF�v���[���[���Q�[���Ɏ󂯓����ꂽ�Ƃ��ɌĂяo����܂�
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
// �v���C���[�����ꂽ�Ƃ��A�܂��͋����I�ɏI�������Ƃ��ɁAOn PlayerDisconnect���Ăяo����܂�
// �T�[�o�[�Ɏ��ۂɐڑ����Ă���v���[���[�ɑ΂��Ă̂݌Ăяo����A���؂ɂ���ċ��ۂ��ꂽ�v���[���[�ɑ΂��Ă͌Ăяo����܂���
// ����́A�v���[���[���v���[���[���X�g����폜�����O�ɌĂяo����܂�
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
//�T�[�o�[�ւ̃��b�Z�[�W���������܂�
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