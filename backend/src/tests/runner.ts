// CLI entry point that runs all lightweight backend test suites (recipient
// parsing, rate-limit math) and prints a pass/fail summary, exiting non-zero
// if anything failed. No external test framework dependency.

import { runRecipientTests } from './recipient.test';
import { runRateLimitTests } from './rate-limit.test';

console.log('====================================================');
console.log('🧪 ReachInbox Email Scheduler Test Suite');
console.log('====================================================\n');

const recipientResults = runRecipientTests();
const rateLimitResults = runRateLimitTests();

const allResults = [...recipientResults, ...rateLimitResults];

let passedCount = 0;
let failedCount = 0;

for (const res of allResults) {
  if (res.passed) {
    console.log(`  ✅ PASS: ${res.name}`);
    passedCount++;
  } else {
    console.log(`  ❌ FAIL: ${res.name} - ${res.error}`);
    failedCount++;
  }
}

console.log('\n----------------------------------------------------');
console.log(`Results: ${passedCount} passed, ${failedCount} failed, ${allResults.length} total.`);
console.log('----------------------------------------------------\n');

if (failedCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
