module.exports = Object.freeze({
    WindowType: {
        Modal: 'modal',
        Modeless: 'modeless'
    },
    SocketSilentTopics: [
        '$stream-write', '$stream-read', 'stream_ping', 'stream_pong',
        'check_connection', 'move', 'user_move'
    ]
});