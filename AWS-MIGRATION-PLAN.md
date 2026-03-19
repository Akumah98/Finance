# 🚀 AWS Migration Plan: From MongoDB to Serverless

## 📋 Overview

This guide details migrating your Glitch app backend from MongoDB to AWS serverless architecture (DynamoDB + Lambda + API Gateway).

---

## 🎯 Migration Goals

- ✅ Move from MongoDB Atlas to AWS DynamoDB
- ✅ Replace Express server with AWS Lambda
- ✅ Use API Gateway for HTTP endpoints
- ✅ Maintain all existing functionality
- ✅ Prepare for AI integration
- ✅ Reduce costs and improve scalability

---

## 📅 Migration Timeline: 2-3 Days

### Day 1: AWS Setup & DynamoDB

### Day 2: Lambda Functions & API Gateway

### Day 3: Testing & Frontend Updates

---

## 🛠️ Prerequisites

### Required Accounts & Tools

```bash
# 1. AWS Account (Free tier available)
# 2. AWS CLI installed
npm install -g aws-cli

# 3. Configure AWS CLI
aws configure
# Enter AWS Access Key ID
# Enter AWS Secret Access Key
# Default region: us-east-1
# Default format: json

# 4. Node.js & npm (already have)
# 5. Your current backend code (already have)
```

---

## 🗂️ Project Structure

```
glitch-migration/
├── aws/
│   ├── dynamodb/
│   │   ├── tables.json
│   │   └── seed-data.json
│   ├── lambda/
│   │   ├── auth/
│   │   │   ├── register.js
│   │   │   ├── login.js
│   │   │   ├── forgot-password.js
│   │   │   ├── verify-reset-token.js
│   │   │   └── reset-password.js
│   │   ├── users/
│   │   ├── budgets/
│   │   └── transactions/
│   ├── api-gateway/
│   │   └── api-definition.json
│   └── deployment/
│       ├── deploy.sh
│       └── rollback.sh
├── scripts/
│   ├── export-mongodb.js
│   ├── transform-data.js
│   └── import-dynamodb.js
└── docs/
    ├── migration-checklist.md
    └── testing-plan.md
```

---

## 📊 Step 1: Export Current MongoDB Data

### Create Data Export Script

```javascript
// scripts/export-mongodb.js
const mongoose = require("mongoose");
const fs = require("fs");

// Connect to your MongoDB
mongoose.connect("mongodb://127.0.0.1:27017/glitch_db");

const exportData = async () => {
  try {
    // Export Users
    const users = await User.find({});
    fs.writeFileSync(
      "aws/dynamodb/seed-data.json",
      JSON.stringify(
        {
          users: users.map((user) => ({
            id: user._id.toString(),
            userName: user.userName,
            email: user.email,
            password: user.password,
            phoneNumber: user.phoneNumber || "",
            streak: user.streak || 0,
            lastActivityDate: user.lastActivityDate,
            achievements: user.achievements || {},
            createdAt: user.createdAt,
            resetPasswordToken: user.resetPasswordToken,
            resetPasswordExpire: user.resetPasswordExpire,
          })),
        },
        null,
        2,
      ),
    );

    // Export other collections (budgets, transactions, etc.)
    console.log("✅ Data exported successfully");
    process.exit(0);
  } catch (error) {
    console.error("❌ Export failed:", error);
    process.exit(1);
  }
};

exportData();
```

### Run Export

```bash
cd scripts
node export-mongodb.js
```

---

## 🗄️ Step 2: Setup DynamoDB Tables

### Create Tables Script

```javascript
// aws/dynamodb/tables.json
[
  {
    TableName: "users",
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "email", AttributeType: "S" },
    ],
    KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
    GlobalSecondaryIndexes: [
      {
        IndexName: "EmailIndex",
        KeySchema: [{ AttributeName: "email", KeyType: "HASH" }],
        Projection: { ProjectionType: "ALL" },
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5,
        },
      },
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5,
    },
  },
  {
    TableName: "budgets",
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "userId", AttributeType: "S" },
    ],
    KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
    GlobalSecondaryIndexes: [
      {
        IndexName: "UserBudgetsIndex",
        KeySchema: [{ AttributeName: "userId", KeyType: "HASH" }],
        Projection: { ProjectionType: "ALL" },
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5,
        },
      },
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5,
    },
  },
  {
    TableName: "transactions",
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "userId", AttributeType: "S" },
      { AttributeName: "budgetId", AttributeType: "S" },
    ],
    KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
    GlobalSecondaryIndexes: [
      {
        IndexName: "UserTransactionsIndex",
        KeySchema: [{ AttributeName: "userId", KeyType: "HASH" }],
        Projection: { ProjectionType: "ALL" },
        ProvisionedThroughput: {
          ReadCapacityUnits: 10,
          WriteCapacityUnits: 10,
        },
      },
      {
        IndexName: "BudgetTransactionsIndex",
        KeySchema: [{ AttributeName: "budgetId", KeyType: "HASH" }],
        Projection: { ProjectionType: "ALL" },
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5,
        },
      },
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 10,
      WriteCapacityUnits: 10,
    },
  },
];
```

### Create Tables

```bash
# Create DynamoDB tables
aws dynamodb create-table --cli-input-json file://aws/dynamodb/tables.json --region us-east-1

# Verify tables created
aws dynamodb list-tables --region us-east-1
```

---

## 📥 Step 3: Import Data to DynamoDB

### Import Script

```javascript
// scripts/import-dynamodb.js
const AWS = require("aws-sdk");
const fs = require("fs");

// Configure AWS
AWS.config.update({ region: "us-east-1" });
const dynamodb = new AWS.DynamoDB.DocumentClient();

const importData = async () => {
  try {
    const data = JSON.parse(fs.readFileSync("aws/dynamodb/seed-data.json"));

    // Import users
    for (const user of data.users) {
      const params = {
        TableName: "users",
        Item: user,
      };
      await dynamodb.put(params).promise();
    }

    console.log("✅ Data imported successfully");
  } catch (error) {
    console.error("❌ Import failed:", error);
  }
};

importData();
```

### Run Import

```bash
cd scripts
node import-dynamodb.js
```

---

## ⚡ Step 4: Create Lambda Functions

### Auth Lambda Functions

#### Register Function

```javascript
// aws/lambda/auth/register.js
const AWS = require("aws-sdk");
const dynamodb = new AWS.DynamoDB.DocumentClient();
const bcrypt = require("bcryptjs");

exports.handler = async (event) => {
  try {
    const { userName, email, password, phoneNumber } = JSON.parse(event.body);

    // Validation
    if (!userName || !email || !password) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Please enter all fields" }),
      };
    }

    // Check if user exists
    const existingUser = await dynamodb
      .query({
        TableName: "users",
        IndexName: "EmailIndex",
        KeyConditionExpression: "email = :email",
        ExpressionAttributeValues: { ":email": email },
      })
      .promise();

    if (existingUser.Items.length > 0) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "User already exists" }),
      };
    }

    // Create user
    const userId = require("uuid").v4();
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = {
      id: userId,
      userName,
      email,
      password: hashedPassword,
      phoneNumber: phoneNumber || "",
      streak: 0,
      lastActivityDate: null,
      achievements: {
        budgetMaster: 0,
        savingsPro: 0,
        streakKing: 0,
        debtSlayer: 0,
      },
      createdAt: new Date().toISOString(),
    };

    await dynamodb
      .put({
        TableName: "users",
        Item: user,
      })
      .promise();

    // Create JWT token
    const jwt = require("jsonwebtoken");
    const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        user: {
          id: userId,
          userName,
          email,
        },
      }),
    };
  } catch (error) {
    console.error("Register error:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Server error" }),
    };
  }
};
```

#### Login Function

```javascript
// aws/lambda/auth/login.js
const AWS = require("aws-sdk");
const dynamodb = new AWS.DynamoDB.DocumentClient();
const bcrypt = require("bcryptjs");

exports.handler = async (event) => {
  try {
    const { email, password } = JSON.parse(event.body);

    // Validation
    if (!email || !password) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Please enter all fields" }),
      };
    }

    // Find user
    const result = await dynamodb
      .query({
        TableName: "users",
        IndexName: "EmailIndex",
        KeyConditionExpression: "email = :email",
        ExpressionAttributeValues: { ":email": email },
      })
      .promise();

    const user = result.Items[0];
    if (!user) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "User does not exist" }),
      };
    }

    // Validate password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Invalid credentials" }),
      };
    }

    // Create JWT token
    const jwt = require("jsonwebtoken");
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        user: {
          id: user.id,
          userName: user.userName,
          email: user.email,
        },
      }),
    };
  } catch (error) {
    console.error("Login error:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Server error" }),
    };
  }
};
```

#### Forgot Password Function

```javascript
// aws/lambda/auth/forgot-password.js
const AWS = require("aws-sdk");
const dynamodb = new AWS.DynamoDB.DocumentClient();
const crypto = require("crypto");
const brevo = require("@getbrevo/brevo");

// Initialize Brevo
const defaultClient = brevo.ApiClient.instance;
const apiKey = defaultClient.authentications["api-key"];
apiKey.apiKey = process.env.BREVO_API_KEY;

exports.handler = async (event) => {
  try {
    const { email } = JSON.parse(event.body);

    if (!email) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Email required" }),
      };
    }

    // Check if user exists
    const result = await dynamodb
      .query({
        TableName: "users",
        IndexName: "EmailIndex",
        KeyConditionExpression: "email = :email",
        ExpressionAttributeValues: { ":email": email },
      })
      .promise();

    if (result.Items.length === 0) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "If email exists, reset link sent" }),
      };
    }

    const user = result.Items[0];

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Update user with reset token
    await dynamodb
      .update({
        TableName: "users",
        Key: { id: user.id },
        UpdateExpression:
          "SET resetPasswordToken = :token, resetPasswordExpire = :expire",
        ExpressionAttributeValues: {
          ":token": resetTokenHash,
          ":expire": Date.now() + 15 * 60 * 1000, // 15 minutes
        },
      })
      .promise();

    // Send email via Brevo
    const apiInstance = new brevo.TransactionalEmailsApi();
    const resetUrl = `${
      process.env.NODE_ENV === "production"
        ? "https://your-domain.com"
        : "http://localhost:3000"
    }/reset-password?token=${resetToken}`;

    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.to = [{ email: user.email, name: user.userName }];
    sendSmtpEmail.sender = {
      email: process.env.FROM_EMAIL,
      name: process.env.FROM_NAME,
    };
    sendSmtpEmail.subject = "Password Reset Request - Glitch App";
    sendSmtpEmail.htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 20px; border-radius: 10px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 32px;">Glitch App</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Password Reset Request</p>
        </div>
        <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="color: #333; font-size: 16px; margin: 0 0 20px 0;">Hi ${user.userName},</p>
          <p style="color: #666; font-size: 14px; margin: 0 0 30px 0;">You requested a password reset for your Glitch App account. Click the button below to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 50px; font-weight: bold; display: inline-block; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
              Reset Password
            </a>
          </div>
          <p style="color: #999; font-size: 12px; margin: 30px 0 10px 0;">This link will expire in 15 minutes for security reasons.</p>
          <p style="color: #999; font-size: 12px; margin: 0;">If you didn't request this, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; margin: 0;">Best regards,<br>Glitch App Team</p>
        </div>
      </div>
    `;

    await apiInstance.sendTransacEmail(sendSmtpEmail);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Reset link sent",
        token: resetToken, // For development testing
      }),
    };
  } catch (error) {
    console.error("Forgot password error:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Server error" }),
    };
  }
};
```

---

## 🌐 Step 5: Setup API Gateway

### Create API Gateway

```bash
# Create REST API
aws apigateway create-rest-api --name glitch-api --region us-east-1

# Get API ID
API_ID=$(aws apigateway get-rest-apis --region us-east-1 | jq -r '.items[] | select(.name=="glitch-api") | .id')

# Create resources
aws apigateway create-resource --rest-api-id $API_ID --parent-id $ROOT_ID --path-part auth

# Create methods and integrate with Lambda
# (Detailed API Gateway setup in separate script)
```

---

## 📦 Step 6: Package and Deploy Lambda Functions

### Deployment Script

```bash
#!/bin/bash
# aws/deployment/deploy.sh

echo "🚀 Starting AWS deployment..."

# Install dependencies
cd aws/lambda
npm install

# Package each Lambda function
for dir in auth users budgets transactions; do
  echo "📦 Packaging $dir functions..."
  cd $dir
  zip -r ../${dir}-functions.zip .
  cd ..
done

# Deploy to Lambda
echo "⚡ Deploying to Lambda..."
for func in register login forgot-password verify-reset-token reset-password; do
  aws lambda update-function-code \
    --function-name ${func} \
    --zip-file fileb://auth/${func}.zip \
    --region us-east-1
done

echo "✅ Deployment complete!"
```

---

## 🔧 Step 7: Update Environment Variables

### Lambda Environment Variables

```bash
# Set environment variables for each Lambda function
aws lambda update-function-configuration \
  --function-name register \
  --environment Variables="{JWT_SECRET=your-jwt-secret,NODE_ENV=development}"

aws lambda update-function-configuration \
  --function-name forgot-password \
  --environment Variables="{BREVO_API_KEY=your-brevo-api-key,FROM_EMAIL=noreply@glitch.app,FROM_NAME=Glitch App,NODE_ENV=development}"
```

---

## 📱 Step 8: Update Frontend Configuration

### Update API URL

```typescript
// constants/config.ts
export const API_URL =
  process.env.NODE_ENV === "production"
    ? "https://your-api-id.execute-api.us-east-1.amazonaws.com/production"
    : "https://your-api-id.execute-api.us-east-1.amazonaws.com/development";
```

---

## 🧪 Step 9: Testing & Validation

### Test Plan

```markdown
## Testing Checklist

### Authentication Tests

- [ ] User registration
- [ ] User login
- [ ] Invalid credentials
- [ ] Duplicate email handling

### Password Reset Tests

- [ ] Forgot password email sending
- [ ] Token validation
- [ ] Password reset
- [ ] Token expiration

### Data Migration Tests

- [ ] All users migrated
- [ ] User data integrity
- [ ] Budget data preserved
- [ ] Transaction data preserved

### Performance Tests

- [ ] API response times
- [ ] Concurrent user handling
- [ ] Error handling
```

### Test Script

```javascript
// scripts/test-aws-api.js
const axios = require("axios");

const API_URL =
  "https://your-api-id.execute-api.us-east-1.amazonaws.com/development";

const tests = [
  {
    name: "Register User",
    method: "POST",
    url: "/auth/register",
    data: {
      userName: "testuser",
      email: "test@example.com",
      password: "password123",
    },
  },
  {
    name: "Login User",
    method: "POST",
    url: "/auth/login",
    data: { email: "test@example.com", password: "password123" },
  },
  {
    name: "Forgot Password",
    method: "POST",
    url: "/auth/forgot-password",
    data: { email: "test@example.com" },
  },
];

tests.forEach(async (test) => {
  try {
    const response = await axios({
      method: test.method,
      url: `${API_URL}${test.url}`,
      data: test.data,
    });
    console.log(`✅ ${test.name}: ${response.status}`);
  } catch (error) {
    console.log(`❌ ${test.name}: ${error.response?.status || error.message}`);
  }
});
```

---

## 🔄 Step 10: Switch Over & Decommission

### Switch Over Steps

1. **Backup MongoDB** one final time
2. **Deploy AWS API** to production
3. **Update frontend** to use AWS endpoints
4. **Monitor** for errors and performance
5. **Decommission** MongoDB server after confirmation

### Rollback Plan

```bash
# If issues arise, rollback quickly:
# 1. Update frontend API URL back to local server
# 2. Restart MongoDB server
# 3. Verify all functionality restored
```

---

## 📊 Cost Comparison

### Before (MongoDB Atlas)

```
Shared Cluster: $25/month
Server hosting: $20/month
Total: ~$45/month
```

### After (AWS Serverless)

```
DynamoDB: $1.25/month (free tier covers most)
Lambda: $0.20/month (free tier covers most)
API Gateway: $3.50/month
Total: ~$5/month (90% cost reduction!)
```

---

## 🎯 Migration Checklist

### Pre-Migration

- [ ] AWS account setup
- [ ] CLI configured
- [ ] Backup current data
- [ ] Test environment ready

### Migration Day

- [ ] Export MongoDB data
- [ ] Create DynamoDB tables
- [ ] Import data to DynamoDB
- [ ] Deploy Lambda functions
- [ ] Setup API Gateway
- [ ] Update frontend configuration

### Post-Migration

- [ ] Test all functionality
- [ ] Monitor performance
- [ ] Update documentation
- [ ] Decommission old infrastructure

---

## 🚨 Important Notes

### Security

- Use AWS IAM roles for Lambda functions
- Enable VPC endpoints for sensitive operations
- Monitor CloudWatch logs for security events

### Performance

- Enable DynamoDB auto-scaling
- Use Lambda provisioned concurrency for consistent performance
- Monitor CloudWatch metrics

### Monitoring

- Set up CloudWatch alarms
- Enable X-Ray tracing
- Monitor error rates and latency

---

## 🎉 Migration Complete!

Once all steps are completed, your app will be:

- ✅ Running on AWS serverless infrastructure
- ✅ More scalable and cost-effective
- ✅ Ready for AI integration
- ✅ Future-proofed for growth

**Ready to start the migration?** Let me know which step you'd like to begin with! 🚀
