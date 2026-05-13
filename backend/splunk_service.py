import requests
from requests.auth import HTTPBasicAuth
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

SPLUNK_URL = "https://localhost:8089"
SPLUNK_USER = "admin"
SPLUNK_PASSWORD = "admin123"
def search_splunk(query):
    url = f"{SPLUNK_URL}/services/search/jobs/export"

    data = {
        "search": query,
        "output_mode": "json"
    }

    response = requests.post(
        url,
        data=data,
        auth=HTTPBasicAuth(SPLUNK_USER, SPLUNK_PASSWORD),
        verify=False
    )

    return response.text
