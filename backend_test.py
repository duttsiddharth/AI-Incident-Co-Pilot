#!/usr/bin/env python3
"""
Backend API Testing for AI Incident Co-Pilot
Tests health endpoint and analyze endpoint functionality
"""

import requests
import sys
import json
from datetime import datetime

class IncidentCoPilotTester:
    def __init__(self, base_url="https://full-stack-preview-13.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
        
        result = {
            "test": name,
            "status": "PASS" if success else "FAIL",
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status_icon = "✅" if success else "❌"
        print(f"{status_icon} {name}: {details}")

    def test_health_endpoint(self):
        """Test the /api/health endpoint"""
        try:
            response = requests.get(f"{self.api_url}/health", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "healthy":
                    rag_status = data.get("rag_loaded", False)
                    details = f"Status: {data['status']}, RAG Loaded: {rag_status}"
                    self.log_test("Health Check", True, details)
                    return True, data
                else:
                    self.log_test("Health Check", False, f"Unhealthy status: {data}")
                    return False, data
            else:
                self.log_test("Health Check", False, f"HTTP {response.status_code}")
                return False, {}
                
        except Exception as e:
            self.log_test("Health Check", False, f"Error: {str(e)}")
            return False, {}

    def test_analyze_endpoint_simple(self):
        """Test analyze endpoint with simple ticket"""
        ticket_data = {
            "ticket": "INCIDENT: Phone system down\nIMPACT: 10 users cannot make calls\nSYMPTOMS: SIP registration failures"
        }
        
        try:
            response = requests.post(
                f"{self.api_url}/analyze",
                json=ticket_data,
                headers={"Content-Type": "application/json"},
                timeout=30  # Longer timeout for LLM calls
            )
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["summary", "priority", "root_cause", "resolution_steps", "confidence_score"]
                
                missing_fields = [field for field in required_fields if field not in data]
                if missing_fields:
                    self.log_test("Analyze Simple Ticket", False, f"Missing fields: {missing_fields}")
                    return False, data
                
                # Validate priority format
                if data["priority"] not in ["P1", "P2", "P3"]:
                    self.log_test("Analyze Simple Ticket", False, f"Invalid priority: {data['priority']}")
                    return False, data
                
                # Validate confidence score
                confidence = data["confidence_score"]
                if not isinstance(confidence, int) or confidence < 0 or confidence > 100:
                    self.log_test("Analyze Simple Ticket", False, f"Invalid confidence: {confidence}")
                    return False, data
                
                details = f"Priority: {data['priority']}, Confidence: {confidence}%"
                self.log_test("Analyze Simple Ticket", True, details)
                return True, data
            else:
                error_msg = response.text
                self.log_test("Analyze Simple Ticket", False, f"HTTP {response.status_code}: {error_msg}")
                return False, {}
                
        except Exception as e:
            self.log_test("Analyze Simple Ticket", False, f"Error: {str(e)}")
            return False, {}

    def test_analyze_endpoint_complex(self):
        """Test analyze endpoint with complex P1 ticket"""
        ticket_data = {
            "ticket": """INCIDENT: Complete Contact Center Outage
TIME: Started 09:15 AM EST
IMPACT: 500+ agents unable to login, all customer calls failing
SYMPTOMS:
- CUCM Publisher showing database connectivity errors
- All phones displaying "CM Down" status
- Finesse desktop showing "Service Unavailable"
- Database cluster showing primary node failure
- Network monitoring shows 100% packet loss to DB subnet
USER REPORTS: "Cannot login to Finesse, phones are dead"
BUSINESS IMPACT: CRITICAL - Complete service outage, revenue loss estimated at $50K/hour"""
        }
        
        try:
            response = requests.post(
                f"{self.api_url}/analyze",
                json=ticket_data,
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Should be P1 for complete outage
                if data.get("priority") != "P1":
                    self.log_test("Analyze Complex P1 Ticket", False, f"Expected P1, got {data.get('priority')}")
                    return False, data
                
                # Should have bridge update for P1
                bridge_update = data.get("bridge_update", "")
                if bridge_update == "N/A" or not bridge_update:
                    self.log_test("Analyze Complex P1 Ticket", False, "Missing bridge update for P1 incident")
                    return False, data
                
                details = f"Priority: {data['priority']}, Bridge Update: {'Present' if bridge_update != 'N/A' else 'Missing'}"
                self.log_test("Analyze Complex P1 Ticket", True, details)
                return True, data
            else:
                error_msg = response.text
                self.log_test("Analyze Complex P1 Ticket", False, f"HTTP {response.status_code}: {error_msg}")
                return False, {}
                
        except Exception as e:
            self.log_test("Analyze Complex P1 Ticket", False, f"Error: {str(e)}")
            return False, {}

    def test_analyze_endpoint_invalid_input(self):
        """Test analyze endpoint with invalid input"""
        try:
            # Test empty ticket
            response = requests.post(
                f"{self.api_url}/analyze",
                json={"ticket": ""},
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            # Should handle empty input gracefully
            if response.status_code in [400, 422]:
                self.log_test("Analyze Invalid Input", True, "Properly rejected empty ticket")
                return True, {}
            elif response.status_code == 200:
                # If it processes empty ticket, that's also acceptable
                self.log_test("Analyze Invalid Input", True, "Processed empty ticket gracefully")
                return True, response.json()
            else:
                self.log_test("Analyze Invalid Input", False, f"Unexpected status: {response.status_code}")
                return False, {}
                
        except Exception as e:
            self.log_test("Analyze Invalid Input", False, f"Error: {str(e)}")
            return False, {}

    def test_runbooks_endpoint(self):
        """Test the /api/runbooks endpoint"""
        try:
            response = requests.get(f"{self.api_url}/runbooks", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                runbooks = data.get("runbooks", [])
                
                if len(runbooks) > 0:
                    details = f"Found {len(runbooks)} runbooks"
                    self.log_test("Runbooks Endpoint", True, details)
                    return True, data
                else:
                    self.log_test("Runbooks Endpoint", False, "No runbooks found")
                    return False, data
            else:
                self.log_test("Runbooks Endpoint", False, f"HTTP {response.status_code}")
                return False, {}
                
        except Exception as e:
            self.log_test("Runbooks Endpoint", False, f"Error: {str(e)}")
            return False, {}

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting AI Incident Co-Pilot Backend Tests")
        print(f"🔗 Testing API: {self.api_url}")
        print("=" * 60)
        
        # Test health endpoint first
        health_success, health_data = self.test_health_endpoint()
        
        if not health_success:
            print("\n❌ Health check failed - stopping tests")
            return self.generate_report()
        
        # Test runbooks endpoint
        self.test_runbooks_endpoint()
        
        # Test analyze endpoints
        self.test_analyze_endpoint_simple()
        self.test_analyze_endpoint_complex()
        self.test_analyze_endpoint_invalid_input()
        
        return self.generate_report()

    def generate_report(self):
        """Generate test report"""
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%")
        
        # Show failed tests
        failed_tests = [test for test in self.test_results if test["status"] == "FAIL"]
        if failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"  - {test['test']}: {test['details']}")
        
        return {
            "total_tests": self.tests_run,
            "passed_tests": self.tests_passed,
            "failed_tests": self.tests_run - self.tests_passed,
            "success_rate": (self.tests_passed/self.tests_run*100) if self.tests_run > 0 else 0,
            "test_results": self.test_results
        }

def main():
    """Main test execution"""
    tester = IncidentCoPilotTester()
    report = tester.run_all_tests()
    
    # Return exit code based on success
    return 0 if report["failed_tests"] == 0 else 1

if __name__ == "__main__":
    sys.exit(main())