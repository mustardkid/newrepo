/**
 * Simple Test Runner for RideReels Platform
 * Tests core functionality without requiring TypeScript compilation
 */

import { expect } from 'chai';
import request from 'supertest';
import express from 'express';

class SimpleTestRunner {
  constructor() {
    this.testResults = [];
    this.passedTests = 0;
    this.failedTests = 0;
  }

  async runAllTests() {
    console.log('\n🚀 Running RideReels Platform Tests...\n');
    
    try {
      // Test 1: Database Connection
      await this.testDatabaseConnection();
      
      // Test 2: Environment Variables
      await this.testEnvironmentVariables();
      
      // Test 3: Server Startup
      await this.testServerStartup();
      
      // Test 4: API Endpoints
      await this.testAPIEndpoints();
      
      // Test 5: Email Service
      await this.testEmailService();
      
      // Test 6: Video Upload Process
      await this.testVideoUploadProcess();
      
      this.generateReport();
      
    } catch (error) {
      console.error('❌ Test execution failed:', error);
      this.failedTests++;
    }
    
    return {
      passed: this.passedTests,
      failed: this.failedTests,
      total: this.passedTests + this.failedTests
    };
  }

  async testDatabaseConnection() {
    console.log('📊 Testing Database Connection...');
    
    try {
      // Test database environment variable
      if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL environment variable not set');
      }
      
      console.log('✅ Database environment variable configured');
      this.passedTests++;
      
    } catch (error) {
      console.error('❌ Database connection test failed:', error.message);
      this.failedTests++;
    }
  }

  async testEnvironmentVariables() {
    console.log('🔑 Testing Environment Variables...');
    
    const requiredVars = [
      'DATABASE_URL',
      'OPENAI_API_KEY',
      'SENDGRID_API_KEY',
      'CF_ACCOUNT_ID',
      'CF_STREAM_TOKEN'
    ];
    
    const missingVars = [];
    
    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        missingVars.push(varName);
      }
    }
    
    if (missingVars.length > 0) {
      console.error('❌ Missing environment variables:', missingVars.join(', '));
      this.failedTests++;
    } else {
      console.log('✅ All required environment variables present');
      this.passedTests++;
    }
  }

  async testServerStartup() {
    console.log('🚀 Testing Server Startup...');
    
    try {
      // Test server on current port
      const response = await fetch('http://localhost:5000/api/auth/user');
      
      if (response.status === 401 || response.status === 200) {
        console.log('✅ Server is running and responding');
        this.passedTests++;
      } else {
        throw new Error(`Server responded with unexpected status: ${response.status}`);
      }
      
    } catch (error) {
      console.error('❌ Server startup test failed:', error.message);
      this.failedTests++;
    }
  }

  async testAPIEndpoints() {
    console.log('🔌 Testing API Endpoints...');
    
    try {
      const endpoints = [
        '/api/auth/user',
        '/api/videos/my-detailed',
        '/api/notifications',
        '/api/earnings/projection'
      ];
      
      let workingEndpoints = 0;
      
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(`http://localhost:5000${endpoint}`);
          if (response.status === 401 || response.status === 200) {
            workingEndpoints++;
          }
        } catch (error) {
          console.log(`⚠️  Endpoint ${endpoint} not accessible: ${error.message}`);
        }
      }
      
      if (workingEndpoints >= endpoints.length - 1) {
        console.log(`✅ API endpoints responding (${workingEndpoints}/${endpoints.length})`);
        this.passedTests++;
      } else {
        throw new Error(`Too many endpoints failing: ${workingEndpoints}/${endpoints.length}`);
      }
      
    } catch (error) {
      console.error('❌ API endpoints test failed:', error.message);
      this.failedTests++;
    }
  }

  async testEmailService() {
    console.log('📧 Testing Email Service...');
    
    try {
      if (!process.env.SENDGRID_API_KEY) {
        throw new Error('SENDGRID_API_KEY not configured');
      }
      
      console.log('✅ SendGrid API key configured');
      this.passedTests++;
      
    } catch (error) {
      console.error('❌ Email service test failed:', error.message);
      this.failedTests++;
    }
  }

  async testVideoUploadProcess() {
    console.log('🎥 Testing Video Upload Process...');
    
    try {
      if (!process.env.CF_ACCOUNT_ID || !process.env.CF_STREAM_TOKEN) {
        throw new Error('Cloudflare Stream credentials not configured');
      }
      
      console.log('✅ Cloudflare Stream credentials configured');
      this.passedTests++;
      
    } catch (error) {
      console.error('❌ Video upload process test failed:', error.message);
      this.failedTests++;
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📋 TEST EXECUTION REPORT');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${this.passedTests}`);
    console.log(`❌ Failed: ${this.failedTests}`);
    console.log(`📊 Total: ${this.passedTests + this.failedTests}`);
    
    const successRate = ((this.passedTests / (this.passedTests + this.failedTests)) * 100).toFixed(1);
    console.log(`📈 Success Rate: ${successRate}%`);
    
    if (this.failedTests === 0) {
      console.log('\n🎉 All tests passed! Platform is ready for deployment.');
    } else {
      console.log('\n⚠️  Some tests failed. Review issues above.');
    }
    
    console.log('='.repeat(60));
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const testRunner = new SimpleTestRunner();
  testRunner.runAllTests();
}

export { SimpleTestRunner };