import requests
import json

BASE_URL = "http://localhost:5000"

def test_register():
    resp = requests.post(f"{BASE_URL}/register", data={
        "username": "testuser",
        "password": "testpass",
        "email": "test@example.com"
    })
    print("Register:", resp.status_code, resp.json())

def test_login():
    resp = requests.post(f"{BASE_URL}/login", data={
        "username": "testuser",
        "password": "testpass"
    })
    print("Login:", resp.status_code, resp.json())
    return resp.cookies

def test_search_users(cookies):
    resp = requests.get(f"{BASE_URL}/api/search_users?q=test", cookies=cookies)
    print("Search:", resp.json())

def test_send_request(cookies):
    # First create another user to send request to
    requests.post(f"{BASE_URL}/register", data={
        "username": "other",
        "password": "pass",
        "email": "other@example.com"
    })
    resp = requests.post(f"{BASE_URL}/api/send_request", 
                         json={"contact_id": 2},  # assuming other user id=2
                         cookies=cookies,
                         headers={"Content-Type": "application/json"})
    print("Send Request:", resp.status_code, resp.json())

def test_contacts(cookies):
    resp = requests.get(f"{BASE_URL}/api/contacts", cookies=cookies)
    print("Contacts:", resp.json())

def test_logout(cookies):
    resp = requests.get(f"{BASE_URL}/logout", cookies=cookies)
    print("Logout:", resp.status_code)

if __name__ == "__main__":
    test_register()
    cookies = test_login()
    test_search_users(cookies)
    test_send_request(cookies)
    test_contacts(cookies)
    test_logout(cookies)
