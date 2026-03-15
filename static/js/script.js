$(document).ready(function() {
    const socket = io();
    let currentCall = null;
    let ringtone = new Audio('/static/assets/ringtone.mp3');
    ringtone.loop = true;

    // ========== Authentication Forms ==========
    $('#showRegister').click(function(e) {
        e.preventDefault();
        $('#loginForm').hide();
        $('#registerForm').show();
    });
    $('#showLogin').click(function(e) {
        e.preventDefault();
        $('#registerForm').hide();
        $('#loginForm').show();
    });

    $('#loginBtn').click(function() {
        $.post('/login', {
            username: $('#loginUsername').val(),
            password: $('#loginPassword').val()
        }).done(function() {
            window.location.href = '/dashboard';
        }).fail(function(xhr) {
            alert('Error: ' + xhr.responseJSON.error);
        });
    });

    $('#registerBtn').click(function() {
        $.post('/register', {
            username: $('#regUsername').val(),
            password: $('#regPassword').val(),
            email: $('#regEmail').val()
        }).done(function() {
            alert('Registration successful! Please login.');
            $('#showLogin').click();
        }).fail(function(xhr) {
            alert('Error: ' + xhr.responseJSON.error);
        });
    });

    // ========== Dashboard ==========
    if ($('#dashboard').length) {
        loadContacts();
        loadPendingRequests();

        // Search users
        $('#searchUser').on('input', function() {
            let query = $(this).val();
            if (query.length < 3) return;
            $.get('/api/search_users', {q: query}).done(function(users) {
                let html = '';
                users.forEach(u => {
                    html += `<li class="list-group-item" data-id="${u.id}" data-username="${u.username}">${u.username} <button class="btn btn-sm btn-primary float-right add-contact">Add</button></li>`;
                });
                $('#searchResults').html(html);
            });
        });

        // Send friend request
        $('#searchResults').on('click', '.add-contact', function() {
            let contactId = $(this).closest('li').data('id');
            $.ajax({
                url: '/api/send_request',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({contact_id: contactId})
            }).done(function(resp) {
                alert(resp.message);
                loadPendingRequests();
            }).fail(function(xhr) {
                alert('Error: ' + xhr.responseJSON.error);
            });
        });

        // Respond to pending request
        $('#pendingList').on('click', '.accept-request', function() {
            let requestId = $(this).data('id');
            $.ajax({
                url: '/api/respond_request',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({request_id: requestId, action: 'accept'})
            }).done(function() {
                loadPendingRequests();
                loadContacts();
            });
        }).on('click', '.reject-request', function() {
            let requestId = $(this).data('id');
            $.ajax({
                url: '/api/respond_request',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({request_id: requestId, action: 'reject'})
            }).done(function() {
                loadPendingRequests();
            });
        });

        // Call user
        $('#contactList').on('click', '.call-user', function() {
            let userId = $(this).data('id');
            let username = $(this).data('username');
            initiateCall(userId, username);
        });

        // Block/Unblock
        $('#contactList').on('click', '.block-user', function() {
            let userId = $(this).data('id');
            $.ajax({
                url: '/api/block_user',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({contact_id: userId})
            }).done(function() {
                loadContacts();
            });
        }).on('click', '.unblock-user', function() {
            let userId = $(this).data('id');
            $.ajax({
                url: '/api/unblock_user',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({contact_id: userId})
            }).done(function() {
                loadContacts();
            });
        });

        // Delete account
        $('#deleteAccount').click(function() {
            if (confirm('Are you sure? This cannot be undone.')) {
                $.post('/api/delete_account').done(function() {
                    window.location.href = '/';
                });
            }
        });

        // Logout
        $('#logoutBtn').click(function() {
            window.location.href = '/logout';
        });
    }

    // ========== Call Functions ==========
    function initiateCall(userId, username) {
        currentCall = {userId, username, direction: 'outgoing'};
        $('#callStatus').text(`Calling ${username}...`);
        $('#outgoingCallModal').addClass('active');
        $('.overlay').addClass('active');
        socket.emit('call_user', {user_id: userId});
    }

    function showIncomingCall(callerId, callerName) {
        currentCall = {callerId, callerName, direction: 'incoming'};
        $('#incomingCaller').text(callerName);
        $('#incomingCallModal').addClass('active');
        $('.overlay').addClass('active');
        ringtone.play();
    }

    function endCall() {
        if (currentCall) {
            socket.emit('end_call', {other_user_id: currentCall.userId || currentCall.callerId});
        }
        hideCallModals();
        currentCall = null;
    }

    function hideCallModals() {
        $('#incomingCallModal, #outgoingCallModal, #activeCallModal').removeClass('active');
        $('.overlay').removeClass('active');
        ringtone.pause();
        ringtone.currentTime = 0;
    }

    // Socket event handlers
    socket.on('incoming_call', function(data) {
        showIncomingCall(data.caller_id, data.caller_name);
    });

    socket.on('call_accepted', function(data) {
        $('#outgoingCallModal').removeClass('active');
        $('#activeCallModal').addClass('active');
        $('#activeCallUser').text(data.callee_name);
        alert('Call accepted! (Mock call in progress)');
    });

    socket.on('call_rejected', function(data) {
        hideCallModals();
        alert(`Call rejected: ${data.reason}`);
    });

    socket.on('call_ended', function() {
        hideCallModals();
        alert('Call ended by other party');
    });

    socket.on('call_error', function(data) {
        hideCallModals();
        alert('Error: ' + data.message);
    });

    // UI buttons
    $('#acceptCall').click(function() {
        socket.emit('accept_call', {caller_id: currentCall.callerId});
        $('#incomingCallModal').removeClass('active');
        $('#activeCallModal').addClass('active');
        $('#activeCallUser').text(currentCall.callerName);
        ringtone.pause();
    });

    $('#rejectCall').click(function() {
        socket.emit('reject_call', {caller_id: currentCall.callerId});
        hideCallModals();
    });

    $('#endCallBtn, #endActiveCall').click(function() {
        endCall();
    });

    $('#cancelCall').click(function() {
        endCall();
    });

    // ========== Helper Functions ==========
    function loadContacts() {
        $.get('/api/contacts').done(function(contacts) {
            let html = '';
            contacts.forEach(c => {
                let statusClass = c.online ? (c.in_call ? 'in-call' : 'online') : 'offline';
                html += `<li class="list-group-item d-flex justify-content-between align-items-center" data-id="${c.id}">
                    <span><span class="online-indicator ${statusClass}"></span> ${c.username}</span>
                    <span>
                        <button class="btn btn-sm btn-success call-user" data-id="${c.id}" data-username="${c.username}">Call</button>
                        <button class="btn btn-sm btn-danger block-user" data-id="${c.id}">Block</button>
                    </span>
                </li>`;
            });
            $('#contactList').html(html);
        });
    }

    function loadPendingRequests() {
        $.get('/api/pending_requests').done(function(requests) {
            let html = '';
            requests.forEach(r => {
                html += `<li class="list-group-item">${r.username} 
                    <button class="btn btn-sm btn-success accept-request" data-id="${r.id}">Accept</button>
                    <button class="btn btn-sm btn-danger reject-request" data-id="${r.id}">Reject</button>
                </li>`;
            });
            $('#pendingList').html(html);
        });
    }
});
