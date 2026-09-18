async function testLogins() {
  const users = [
    { email: "admin@gstreconcile.com", pass: "Admin@1234", expectedRole: "ADMIN" },
    { email: "accountant@gstreconcile.com", pass: "Accountant@1234", expectedRole: "ACCOUNTANT" },
    { email: "viewer@gstreconcile.com", pass: "Viewer@1234", expectedRole: "VIEWER" },
    { email: "superadmin@gstreconcile.com", pass: "Super@1234", expectedRole: "SUPER_ADMIN" },
  ];

  console.log("Testing genuine authentication for existing users...\n");

  for (const u of users) {
    const res = await fetch("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: u.email, password: u.pass }),
    });

    const data = await res.json();
    if (res.status === 200 && data.success && data.user?.role === u.expectedRole) {
      console.log(`✅ [${u.expectedRole}] ${u.email} -> Logged in successfully as '${data.user.name}' (Org: ${data.user.organizationName})`);
    } else {
      console.error(`❌ [${u.expectedRole}] ${u.email} -> Failed:`, data);
      process.exit(1);
    }
  }

  console.log("\nTesting genuine new firm user registration...");
  const uniqueEmail = `user_${Date.now()}@myfirmca.in`;
  const regRes = await fetch("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: "CA Pooja Sharma",
      firmName: "Sharma & Associates Tax Firm",
      email: uniqueEmail,
      mobile: "9876543210",
      password: "Password@123",
    }),
  });

  const regData = await regRes.json();
  if (regRes.status === 200 && regData.success) {
    console.log(`✅ [REGISTRATION] Registered genuine new user '${regData.user.name}' for firm '${regData.user.organizationName}' (${regData.user.email})`);
  } else {
    console.error("❌ Registration failed:", regData);
    process.exit(1);
  }

  console.log("\nTesting login with newly registered genuine user...");
  const newLoginRes = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: uniqueEmail, password: "Password@123" }),
  });
  const newLoginData = await newLoginRes.json();
  if (newLoginRes.status === 200 && newLoginData.success) {
    console.log(`✅ [NEW LOGIN] Logged in with new genuine user '${newLoginData.user.name}' (Org: ${newLoginData.user.organizationName})`);
  } else {
    console.error("❌ New user login failed:", newLoginData);
    process.exit(1);
  }

  console.log("\n🎉 ALL GENUINE LOGINS & USER REGISTRATION 100% OPERATIONAL!");
}

testLogins().catch(console.error);
