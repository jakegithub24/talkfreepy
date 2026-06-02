import pytest
import requests
import os
import time
import re
import logging
import random
import string

BASE_URL = os.environ.get('BASE_URL', 'http://localhost:5000')
logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
log = logging.getLogger('apitest')


def rand_suffix(n=6):
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=n))


def show(resp):
    try:
        content = resp.json()
    except Exception:
        content = resp.text[:1000]
    log.info('%s %s -> %s', resp.request.method, resp.request.path_url, resp.status_code)
    log.info('Response: %s', content)
    return content


@pytest.fixture(scope='module')
def base_url():
    return BASE_URL


@pytest.fixture(scope='module')
def users(base_url):
    # Create two unique users: alice_x and bob_x
    sfx = rand_suffix()
    alice = {'username': f'alice_{sfx}', 'password': 'alicepass', 'email': f'alice_{sfx}@example.com'}
    bob = {'username': f'bob_{sfx}', 'password': 'bobpass', 'email': f'bob_{sfx}@example.com'}

    # Register both
    r = requests.post(f'{base_url}/register', data={'username': alice['username'], 'password': alice['password'], 'email': alice['email']})
    show(r)
    assert r.status_code == 200
    r = requests.post(f'{base_url}/register', data={'username': bob['username'], 'password': bob['password'], 'email': bob['email']})
    show(r)
    assert r.status_code == 200

    # Login sessions
    sa = requests.Session()
    sb = requests.Session()
    r = sa.post(f'{base_url}/login', data={'username': alice['username'], 'password': alice['password']})
    show(r)
    assert r.status_code == 200
    r = sb.post(f'{base_url}/login', data={'username': bob['username'], 'password': bob['password']})
    show(r)
    assert r.status_code == 200

    # Get bob id by searching from alice session
    r = sa.get(f'{base_url}/api/search_users', params={'q': bob['username']})
    show(r)
    assert r.status_code == 200
    users_list = r.json()
    bob_entry = next((u for u in users_list if u['username'] == bob['username']), None)
    assert bob_entry is not None
    bob_id = bob_entry['id']

    yield {'base_url': base_url, 'alice': alice, 'bob': bob, 'sa': sa, 'sb': sb, 'bob_id': bob_id}

    # Teardown: attempt to delete both accounts if sessions still available
    try:
        sb.post(f'{base_url}/api/delete_account')
    except Exception:
        pass
    try:
        sa.post(f'{base_url}/api/delete_account')
    except Exception:
        pass


def test_send_and_accept_request(users):
    sa = users['sa']
    sb = users['sb']
    bob_id = users['bob_id']

    # Alice sends friend request to Bob
    r = sa.post(f"{users['base_url']}/api/send_request", json={'contact_id': bob_id})
    resp = show(r)
    assert r.status_code == 200
    assert 'Request sent' in (resp.get('message') if isinstance(resp, dict) else '')

    # Bob checks pending and accepts
    r = sb.get(f"{users['base_url']}/api/pending_requests")
    pending = show(r)
    assert r.status_code == 200
    assert isinstance(pending, list) and any(p.get('username') == users['alice']['username'] for p in pending)
    req_id = pending[0]['id']

    r = sb.post(f"{users['base_url']}/api/respond_request", json={'request_id': req_id, 'action': 'accept'})
    resp = show(r)
    assert r.status_code == 200
    assert resp.get('message') == 'Request accepted'

    # Both should now see each other in contacts
    r = sa.get(f"{users['base_url']}/api/contacts")
    c_a = show(r)
    assert r.status_code == 200 and any(c['username'] == users['bob']['username'] for c in c_a)
    r = sb.get(f"{users['base_url']}/api/contacts")
    c_b = show(r)
    assert r.status_code == 200 and any(c['username'] == users['alice']['username'] for c in c_b)


def test_block_and_unblock(users):
    sa = users['sa']
    bob_id = users['bob_id']

    # Block
    r = sa.post(f"{users['base_url']}/api/block_user", json={'contact_id': bob_id})
    resp = show(r)
    assert r.status_code == 200 and resp.get('message') == 'User blocked'

    # Unblock
    r = sa.post(f"{users['base_url']}/api/unblock_user", json={'contact_id': bob_id})
    resp = show(r)
    assert r.status_code == 200 and resp.get('message') == 'User unblocked'


def test_password_reset_and_delete(users):
    sb = users['sb']
    base_url = users['base_url']

    # Request reset token (do not follow redirect)
    r = sb.post(f'{base_url}/reset_password', data={'email': users['bob']['email']}, allow_redirects=False)
    show(r)
    token = None
    if r.status_code in (302, 303) and 'Location' in r.headers:
        m = re.search(r'/reset_password/([^/\n]+)', r.headers['Location'])
        if m:
            token = m.group(1)
    else:
        if r.url and '/reset_password/' in r.url:
            m = re.search(r'/reset_password/([^/\n]+)', r.url)
            if m:
                token = m.group(1)
    assert token is not None

    # Submit new password
    r = sb.post(f'{base_url}/reset_password/{token}', data={'password': 'newbobpass'})
    show(r)
    # Login with new password using a fresh session
    snew = requests.Session()
    r = snew.post(f'{base_url}/login', data={'username': users['bob']['username'], 'password': 'newbobpass'})
    show(r)
    assert r.status_code == 200

    # Delete bob account
    r = snew.post(f'{base_url}/api/delete_account')
    resp = show(r)
    assert r.status_code == 200 and resp.get('message') == 'Account deleted'

    # Confirm cannot login
    s2 = requests.Session()
    r = s2.post(f'{base_url}/login', data={'username': users['bob']['username'], 'password': 'newbobpass'})
    show(r)
    assert r.status_code == 401


def test_unauthenticated_access(users):
    # Unauthenticated access to protected endpoint should redirect (Flask-Login) or return 401 for APIs
    r = requests.get(f"{users['base_url']}/api/contacts", allow_redirects=False)
    show(r)
    assert r.status_code in (302, 401)
