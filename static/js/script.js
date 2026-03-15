$(document).ready(function() {
    const socket = io();
    let currentCall = null;
    // Try to load ringtone file; if it fails, use WebAudio oscillator fallback
    let ringtone = new Audio('/static/assets/ringtone.mp3');
    ringtone.loop = true;
    let useOscillator = false;
    let audioCtx = null;
    let osc = null;
    ringtone.addEventListener('error', () => {
        useOscillator = true;
    });
    function playRingtone() {
        if (!useOscillator) {
            ringtone.play().catch(e => { useOscillator = true; playRingtone(); });
            return;
        }
        try {
            if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.value = 540; // pleasant ring-ish frequency
            gain.gain.value = 0.1;
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
        } catch (e) {
            console.warn('Ringtone playback failed', e);
        }
    }
    function stopRingtone() {
        if (!useOscillator) {
            try { ringtone.pause(); ringtone.currentTime = 0; } catch (e) {}
            return;
        }
        if (osc) {
            try { osc.stop(); } catch (e) {}
            osc.disconnect();
            osc = null;
        }
    }

    // ========== Toasts ==========
    function showToast(message, type = 'info', delay = 4000) {
        const toastId = 'toast-' + Date.now() + Math.floor(Math.random()*1000);
        let icon = '';
        if (type === 'success') icon = '<span class="me-2 text-success"><i class="bi bi-check-circle-fill"></i></span>';
        else if (type === 'error') icon = '<span class="me-2 text-danger"><i class="bi bi-x-circle-fill"></i></span>';
        else if (type === 'warning') icon = '<span class="me-2 text-warning"><i class="bi bi-exclamation-triangle-fill"></i></span>';
        else icon = '<span class="me-2 text-primary"><i class="bi bi-info-circle-fill"></i></span>';
        const toastHtml = `
        <div id="${toastId}" class="toast align-items-center text-bg-${type === 'error' ? 'danger' : type === 'success' ? 'success' : type === 'warning' ? 'warning' : 'primary'} border-0 mb-2" role="alert" aria-live="assertive" aria-atomic="true" data-bs-delay="${delay}">
          <div class="d-flex">
            <div class="toast-body">${icon}${message}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
          </div>
        </div>`;
        $('#toastContainer').append(toastHtml);
        const toastEl = document.getElementById(toastId);
        const toast = new bootstrap.Toast(toastEl);
        toast.show();
        toastEl.addEventListener('hidden.bs.toast', function() {
            $(toastEl).remove();
        });
    }

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
            showToast(xhr.responseJSON.error, 'error');
        });
    });

    $('#registerBtn').click(function() {
        $.post('/register', {
            username: $('#regUsername').val(),
            password: $('#regPassword').val(),
            email: $('#regEmail').val()
        }).done(function() {
            showToast('Registration successful! Please login.', 'success');
            $('#showLogin').click();
        }).fail(function(xhr) {
            showToast(xhr.responseJSON.error, 'error');
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
                showToast(resp.message, 'success');
                loadPendingRequests();
            }).fail(function(xhr) {
                showToast(xhr.responseJSON.error, 'error');
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
                showToast('Request accepted', 'success');
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
                showToast('Request rejected', 'warning');
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
                showToast('User blocked', 'warning');
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
                showToast('User unblocked', 'success');
                loadContacts();
            });
        });

        // Delete account
        $('#deleteAccount').click(function() {
            if (confirm('Are you sure? This cannot be undone.')) {
                $.post('/api/delete_account').done(function() {
                    showToast('Account deleted', 'success');
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
    let localStream = null;
    let pc = null;
    const pcConfig = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
    const remoteAudio = new Audio();
    remoteAudio.autoplay = true;
    remoteAudio.playsInline = true;
    // Use ringtone from assets for incoming call notification
    let incomingRingtone = new Audio('/assets/ringtone.mp3');
    incomingRingtone.loop = true;
    let incomingRingtoneActive = false;

    function playIncomingRingtone() {
        incomingRingtone.currentTime = 0;
        incomingRingtone.play().then(() => { incomingRingtoneActive = true; }).catch(() => {});
    }
    function stopIncomingRingtone() {
        if (incomingRingtoneActive) {
            incomingRingtone.pause();
            incomingRingtone.currentTime = 0;
            incomingRingtoneActive = false;
        }
    }

    async function createPeerConnection(targetId) {
        pc = new RTCPeerConnection(pcConfig);
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('webrtc_ice', { target_id: targetId, candidate: event.candidate });
            }
        };
        pc.ontrack = (event) => {
            // Attach remote audio stream (only if not local stream)
            if (event.streams && event.streams[0] && (!localStream || event.streams[0].id !== localStream.id)) {
                remoteAudio.srcObject = event.streams[0];
                remoteAudio.play().catch(() => {});
            }
        };
        return pc;
    }

    async function initiateCall(userId, username) {
        currentCall = {userId, username, direction: 'outgoing'};
        $('#callStatus').text(`Calling ${username}...`);
        $('#outgoingCallModal').addClass('active');
        $('.overlay').addClass('active');
        // Do NOT start getUserMedia or createOffer yet; wait for call_accepted
        // Only notify server to ring user
        socket.emit('call_user', {user_id: userId});
    }

    // When callee accepts, then start WebRTC
    socket.on('call_accepted', async function(data) {
        showToast('Call accepted! Connecting...', 'success');
        // Now start local audio and WebRTC offer
        try {
            localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (err) {
            showToast('Microphone access is required to make calls', 'error');
            hideCallModals();
            return;
        }
        await createPeerConnection(data.callee_id);
        localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('webrtc_offer', { target_id: data.callee_id, sdp: pc.localDescription });
    });

    function showIncomingCall(callerId, callerName) {
        currentCall = {callerId, callerName, direction: 'incoming'};
        $('#incomingCaller').text(callerName);
        $('#incomingCallModal').addClass('active');
        $('.overlay').addClass('active');
        playIncomingRingtone();
    }

    async function acceptIncomingCall() {
        // Stop ringtone
        stopIncomingRingtone();
        try {
            localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (err) {
            showToast('Microphone access is required to accept calls', 'error');
            hideCallModals();
            return;
        }
        const callerId = currentCall.callerId;
        await createPeerConnection(callerId);
        // Add local tracks
        localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
        // Inform server to accept call (existing server-side state)
        socket.emit('accept_call', { caller_id: callerId });
        // The caller will send an offer (or already sent). We will wait for 'webrtc_offer' socket event and respond with answer.
        $('#incomingCallModal').removeClass('active');
        $('#activeCallModal').addClass('active');
        $('#activeCallUser').text(currentCall.callerName);
    }

    async function handleRemoteAnswer(sdp) {
        if (!pc) return;
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        // Stop ringtone and show active call
        stopRingtone();
        $('#outgoingCallModal').removeClass('active');
        $('#activeCallModal').addClass('active');
        $('#activeCallUser').text(currentCall.username);
        // Set in_call state on server after connection
        socket.emit('set_in_call', {user_id: currentCall.userId});
        showToast('Call connected', 'success');
    }

    async function handleRemoteOffer(sdp, fromId) {
        if (!pc) {
            await createPeerConnection(fromId);
        }
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        // Create and send answer
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('webrtc_answer', { target_id: fromId, sdp: pc.localDescription });
        // Set in_call state on server after connection
        socket.emit('set_in_call', {user_id: fromId});
    }

    function handleRemoteIce(candidate) {
        if (!pc) return;
        pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => console.warn('ICE add failed', e));
    }

    function endCall() {
        if (currentCall) {
            socket.emit('end_call', {other_user_id: currentCall.userId || currentCall.callerId});
        }
        cleanupCall();
        hideCallModals();
        currentCall = null;
    }

    function cleanupCall() {
        // Stop local media
        if (localStream) {
            localStream.getTracks().forEach(t => t.stop());
            localStream = null;
        }
        // Close peer connection
        if (pc) {
            try { pc.close(); } catch (e) {}
            pc = null;
        }
        // Stop remote audio
        try { remoteAudio.srcObject = null; } catch (e) {}
        stopRingtone();
        stopIncomingRingtone();
        // Clear in_call state on server
        if (currentCall && (currentCall.userId || currentCall.callerId)) {
            socket.emit('set_not_in_call', {user_id: currentCall.userId || currentCall.callerId});
        }
    }

    function hideCallModals() {
        $('#incomingCallModal, #outgoingCallModal, #activeCallModal').removeClass('active');
        $('.overlay').removeClass('active');
        // ... ringtone handling moved to cleanupCall ...
    }

    // Socket event handlers for signaling
    socket.on('incoming_call', function(data) {
        showIncomingCall(data.caller_id, data.caller_name);
    });

    socket.on('webrtc_offer', async function(data) {
        // Received an offer from a peer
        await handleRemoteOffer(data.sdp, data.from);
    });

    socket.on('webrtc_answer', async function(data) {
        await handleRemoteAnswer(data.sdp);
    });

    socket.on('webrtc_ice', function(data) {
        handleRemoteIce(data.candidate);
    });

    socket.on('call_accepted', function(data) {
        // server notifies caller that callee accepted; actual SDP answer will follow
        showToast('Call accepted! Connecting...', 'success');
    });

    socket.on('call_rejected', function(data) {
        cleanupCall();
        hideCallModals();
        showToast(`Call rejected: ${data.reason}`, 'warning');
    });

    socket.on('call_ended', function() {
        cleanupCall();
        hideCallModals();
        showToast('Call ended by other party', 'info');
    });

    socket.on('call_error', function(data) {
        cleanupCall();
        hideCallModals();
        showToast('Error: ' + data.message, 'error');
    });

    // UI buttons
    $('#acceptCall').off('click').click(function() {
        acceptIncomingCall();
    });

    $('#rejectCall').off('click').click(function() {
        socket.emit('reject_call', {caller_id: currentCall.callerId});
        cleanupCall();
        hideCallModals();
    });

    $('#endCallBtn, #endActiveCall').off('click').click(function() {
        endCall();
    });

    $('#cancelCall').off('click').click(function() {
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
