from splunk_service import search_splunk

query = "search index=*"

result = search_splunk(query)

print(result)
