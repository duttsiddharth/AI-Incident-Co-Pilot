"""
Test suite for AI Incident Co-Pilot Enterprise - History & Trends Features
Tests: /api/incidents/search (filters, pagination) and /api/trends endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestIncidentSearch:
    """Tests for GET /api/incidents/search endpoint with filters and pagination"""
    
    def test_search_basic(self):
        """Test basic search endpoint returns correct structure"""
        response = requests.get(f"{BASE_URL}/api/incidents/search")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "items" in data, "Response should have 'items' field"
        assert "total" in data, "Response should have 'total' field"
        assert "page" in data, "Response should have 'page' field"
        assert "pages" in data, "Response should have 'pages' field"
        
        assert isinstance(data["items"], list), "items should be a list"
        assert isinstance(data["total"], int), "total should be an integer"
        assert isinstance(data["page"], int), "page should be an integer"
        assert isinstance(data["pages"], int), "pages should be an integer"
        print(f"Basic search returned {data['total']} total incidents, page {data['page']} of {data['pages']}")
    
    def test_search_with_priority_filter_p1(self):
        """Test filtering by P1 priority"""
        response = requests.get(f"{BASE_URL}/api/incidents/search?priority=P1")
        assert response.status_code == 200
        
        data = response.json()
        for item in data["items"]:
            assert item["priority"] == "P1", f"Expected P1, got {item['priority']}"
        print(f"P1 filter returned {len(data['items'])} items, all P1 verified")
    
    def test_search_with_priority_filter_p2(self):
        """Test filtering by P2 priority"""
        response = requests.get(f"{BASE_URL}/api/incidents/search?priority=P2")
        assert response.status_code == 200
        
        data = response.json()
        for item in data["items"]:
            assert item["priority"] == "P2", f"Expected P2, got {item['priority']}"
        print(f"P2 filter returned {len(data['items'])} items")
    
    def test_search_with_priority_filter_p3(self):
        """Test filtering by P3 priority"""
        response = requests.get(f"{BASE_URL}/api/incidents/search?priority=P3")
        assert response.status_code == 200
        
        data = response.json()
        for item in data["items"]:
            assert item["priority"] == "P3", f"Expected P3, got {item['priority']}"
        print(f"P3 filter returned {len(data['items'])} items")
    
    def test_search_with_status_filter_open(self):
        """Test filtering by OPEN status"""
        response = requests.get(f"{BASE_URL}/api/incidents/search?status=OPEN")
        assert response.status_code == 200
        
        data = response.json()
        for item in data["items"]:
            assert item["status"] == "OPEN", f"Expected OPEN, got {item['status']}"
        print(f"OPEN status filter returned {len(data['items'])} items")
    
    def test_search_with_status_filter_resolved(self):
        """Test filtering by RESOLVED status"""
        response = requests.get(f"{BASE_URL}/api/incidents/search?status=RESOLVED")
        assert response.status_code == 200
        
        data = response.json()
        for item in data["items"]:
            assert item["status"] == "RESOLVED", f"Expected RESOLVED, got {item['status']}"
        print(f"RESOLVED status filter returned {len(data['items'])} items")
    
    def test_search_pagination_page_1(self):
        """Test pagination - page 1 with limit 5"""
        response = requests.get(f"{BASE_URL}/api/incidents/search?page=1&limit=5")
        assert response.status_code == 200
        
        data = response.json()
        assert data["page"] == 1, f"Expected page 1, got {data['page']}"
        assert len(data["items"]) <= 5, f"Expected max 5 items, got {len(data['items'])}"
        
        # Verify pages calculation
        expected_pages = max(1, (data["total"] + 4) // 5)  # ceiling division
        assert data["pages"] == expected_pages, f"Expected {expected_pages} pages, got {data['pages']}"
        print(f"Page 1 with limit 5: {len(data['items'])} items, {data['pages']} total pages")
    
    def test_search_pagination_page_2(self):
        """Test pagination - page 2"""
        # First get total to know if page 2 exists
        response1 = requests.get(f"{BASE_URL}/api/incidents/search?page=1&limit=5")
        data1 = response1.json()
        
        if data1["pages"] >= 2:
            response = requests.get(f"{BASE_URL}/api/incidents/search?page=2&limit=5")
            assert response.status_code == 200
            
            data = response.json()
            assert data["page"] == 2, f"Expected page 2, got {data['page']}"
            assert len(data["items"]) <= 5, f"Expected max 5 items, got {len(data['items'])}"
            print(f"Page 2 with limit 5: {len(data['items'])} items")
        else:
            print(f"Skipping page 2 test - only {data1['pages']} pages available")
    
    def test_search_combined_filters(self):
        """Test combining priority and status filters"""
        response = requests.get(f"{BASE_URL}/api/incidents/search?priority=P1&status=OPEN")
        assert response.status_code == 200
        
        data = response.json()
        for item in data["items"]:
            assert item["priority"] == "P1", f"Expected P1, got {item['priority']}"
            assert item["status"] == "OPEN", f"Expected OPEN, got {item['status']}"
        print(f"Combined P1+OPEN filter returned {len(data['items'])} items")
    
    def test_search_with_text_search(self):
        """Test text search in summaries"""
        # Search for a common term that might be in incidents
        response = requests.get(f"{BASE_URL}/api/incidents/search?search=SIP")
        assert response.status_code == 200
        
        data = response.json()
        print(f"Text search 'SIP' returned {len(data['items'])} items")
        # Just verify structure, content depends on data
        assert "items" in data
        assert "total" in data
    
    def test_search_items_have_required_fields(self):
        """Test that search results have all required fields for History table"""
        response = requests.get(f"{BASE_URL}/api/incidents/search?limit=5")
        assert response.status_code == 200
        
        data = response.json()
        if len(data["items"]) > 0:
            item = data["items"][0]
            required_fields = ["id", "summary", "priority", "status", "created_at", "sla_breached"]
            for field in required_fields:
                assert field in item, f"Missing required field: {field}"
            print(f"All required fields present in search results")
        else:
            print("No items to verify fields - empty result set")


class TestTrends:
    """Tests for GET /api/trends endpoint"""
    
    def test_trends_basic(self):
        """Test trends endpoint returns correct structure"""
        response = requests.get(f"{BASE_URL}/api/trends")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "volume_trend" in data, "Response should have 'volume_trend'"
        assert "mttr_trend" in data, "Response should have 'mttr_trend'"
        assert "priority_trend" in data, "Response should have 'priority_trend'"
        assert "recurring_patterns" in data, "Response should have 'recurring_patterns'"
        assert "total_incidents" in data, "Response should have 'total_incidents'"
        
        print(f"Trends endpoint returned data for {data['total_incidents']} total incidents")
    
    def test_trends_volume_structure(self):
        """Test volume_trend has correct structure"""
        response = requests.get(f"{BASE_URL}/api/trends")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data["volume_trend"], list), "volume_trend should be a list"
        
        if len(data["volume_trend"]) > 0:
            item = data["volume_trend"][0]
            assert "date" in item, "volume_trend items should have 'date'"
            assert "count" in item, "volume_trend items should have 'count'"
            print(f"Volume trend has {len(data['volume_trend'])} data points")
        else:
            print("Volume trend is empty - no data yet")
    
    def test_trends_mttr_structure(self):
        """Test mttr_trend has correct structure"""
        response = requests.get(f"{BASE_URL}/api/trends")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data["mttr_trend"], list), "mttr_trend should be a list"
        
        if len(data["mttr_trend"]) > 0:
            item = data["mttr_trend"][0]
            assert "date" in item, "mttr_trend items should have 'date'"
            assert "mttr" in item, "mttr_trend items should have 'mttr'"
            print(f"MTTR trend has {len(data['mttr_trend'])} data points")
        else:
            print("MTTR trend is empty - no resolved incidents yet")
    
    def test_trends_priority_structure(self):
        """Test priority_trend has correct structure"""
        response = requests.get(f"{BASE_URL}/api/trends")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data["priority_trend"], list), "priority_trend should be a list"
        
        if len(data["priority_trend"]) > 0:
            item = data["priority_trend"][0]
            assert "date" in item, "priority_trend items should have 'date'"
            assert "P1" in item, "priority_trend items should have 'P1'"
            assert "P2" in item, "priority_trend items should have 'P2'"
            assert "P3" in item, "priority_trend items should have 'P3'"
            print(f"Priority trend has {len(data['priority_trend'])} data points with P1/P2/P3 breakdown")
        else:
            print("Priority trend is empty - no data yet")
    
    def test_trends_recurring_patterns_structure(self):
        """Test recurring_patterns has correct structure"""
        response = requests.get(f"{BASE_URL}/api/trends")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data["recurring_patterns"], list), "recurring_patterns should be a list"
        
        if len(data["recurring_patterns"]) > 0:
            item = data["recurring_patterns"][0]
            assert "pattern" in item, "recurring_patterns items should have 'pattern'"
            assert "count" in item, "recurring_patterns items should have 'count'"
            print(f"Found {len(data['recurring_patterns'])} recurring patterns")
        else:
            print("No recurring patterns detected yet")
    
    def test_trends_total_incidents_matches(self):
        """Test that total_incidents in trends matches actual count"""
        trends_response = requests.get(f"{BASE_URL}/api/trends")
        search_response = requests.get(f"{BASE_URL}/api/incidents/search?limit=1")
        
        assert trends_response.status_code == 200
        assert search_response.status_code == 200
        
        trends_total = trends_response.json()["total_incidents"]
        search_total = search_response.json()["total"]
        
        assert trends_total == search_total, f"Trends total ({trends_total}) should match search total ({search_total})"
        print(f"Total incidents consistent: {trends_total}")


class TestHealthAndIntegration:
    """Integration tests to verify endpoints work together"""
    
    def test_health_check(self):
        """Verify API is healthy"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "healthy"
        assert data["db_connected"] == True
        print("Health check passed - DB connected")
    
    def test_search_and_trends_consistency(self):
        """Verify search and trends return consistent data"""
        search_response = requests.get(f"{BASE_URL}/api/incidents/search")
        trends_response = requests.get(f"{BASE_URL}/api/trends")
        
        assert search_response.status_code == 200
        assert trends_response.status_code == 200
        
        search_total = search_response.json()["total"]
        trends_total = trends_response.json()["total_incidents"]
        
        assert search_total == trends_total, f"Search total ({search_total}) != Trends total ({trends_total})"
        print(f"Search and Trends consistent: {search_total} incidents")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
