#!/bin/bash
echo "=== Checking Environment Variables ==="
echo ""
echo "DATABASE_URL configuration:"
if [ -n "$DATABASE_URL" ]; then
    echo "$DATABASE_URL" | sed 's/:[^:@]*@/:****@/'
else
    echo "❌ Not set"
fi
echo ""
echo "DIRECT_URL configuration:"
if [ -n "$DIRECT_URL" ]; then
    echo "$DIRECT_URL" | sed 's/:[^:@]*@/:****@/'
else
    echo "❌ Not set"
fi
