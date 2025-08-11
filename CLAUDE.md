# Claude Code Instructions

## Production Workflow Requirements

**CRITICAL MANDATORY WORKFLOW**: When working on production code, ALWAYS complete this FULL workflow after EVERY SINGLE fix or change:

1. **Make the code change**
2. **Commit the change locally with descriptive message**
3. **IMMEDIATELY push to GitHub** (`git push origin main`)
4. **NEVER batch multiple commits before pushing**

This COMPLETE workflow must happen after:
- Every bug fix
- Every feature implementation  
- Every code change that needs testing
- Every database migration
- Every configuration change

**WHY THIS MATTERS**: The user is paying for Claude Code and needs to test each change individually in production immediately after it's implemented. Batching commits defeats the purpose of incremental testing.

**NO EXCEPTIONS**: If I make a code change, I MUST push it to GitHub immediately. The user should never have to ask "why hasn't this deployed?" because I should ALWAYS push after every commit.

**FAILURE TO FOLLOW THIS WORKFLOW IS UNACCEPTABLE**