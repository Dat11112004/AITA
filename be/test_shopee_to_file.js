import { GeminiAiProvider } from './src/modules/grading/engine/infrastructure/ai/GeminiAiProvider.js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const shopeePrompt = `PRJ301: Advanced Web Application Development
Practical Assignment: Shopee E-Commerce Algorithmic & System Design Engine
Course Code: PRJ301
Assignment Type: Advanced Programming Assignment
Target Platform: Java Web Enterprise Systems (Shopee Architecture Simulation)

Overview & General Instructions
This assignment comprises 5 real-world engineering challenges modeled after Shopee's backend infrastructure. You are required to implement optimal data structures, high-throughput concurrent logic, dynamic programming, and graph algorithms in Java. All tasks emphasize memory efficiency, algorithmic complexity, and execution speed.

Problem 1: High-Performance Shopee Search Prefix Auto-Complete System
1. Title
Shopee Search Engine: Real-Time Prefix Auto-Complete using Trie and Priority Queue

2. Problem Description
When millions of users type keywords into the Shopee search bar (e.g., "iphone", "ao thun"), the system must immediately suggest the top K most frequent search terms matching the typed prefix. Traditional database queries using SQL wildcard scans (e.g., LIKE 'prefix%') or naive array iteration (O(N * L)) introduce severe latency bottlenecks when searching across millions of keywords.

Your task is to design an in-memory prefix search engine utilizing a custom Trie data structure combined with a Min-Heap (Priority Queue) to achieve sub-millisecond auto-complete responses.

3. Technical Requirements
Language & Data Structures: Java (JDK 17+), Custom TrieNode, PriorityQueue (Min-Heap / Max-Heap).
Algorithm Analysis Requirement: You MUST perform and document a comparative complexity analysis between Naive List Scanning (O(N * L)) and your Trie + Heap implementation (O(L + K log K)) in the comments.

Problem 2: Concurrent Flash Sale Inventory Management & Priority Order Queue
1. Title
Shopee Flash Sale Engine: High-Concurrency Thread-Safe Inventory & Order Processing

2. Problem Description
During Shopee 11.11 Flash Sale events, millions of concurrent user HTTP requests hit the payment backend attempting to purchase limited items (e.g., 100 units of an item discounted by 90%). Overselling, race conditions, or application server deadlocks will crash the system.

Problem 3: Optimal Shopee Multi-Tier Voucher Stacking Engine
1. Title
Shopee Cart Engine: Optimal Multi-Voucher Stacking and Discount Optimization

2. Problem Description
Shopee allows buyers to apply multiple promotional vouchers to a shopping cart. Vouchers belong to different categories:

Problem 4: Real-Time Trending Products Engine using Sliding Window & Top-K Cache
1. Title
Shopee Recommendation Subsystem: Real-Time Trending Products Tracking via Sliding Window

2. Problem Description
Shopee's recommendation dynamic feed shows "Trending Products" based on real-time user interaction stream events.

Problem 5: Multi-Warehouse Smart Order Routing & Logistics Bottleneck Optimization
1. Title
Shopee Fulfillment Network: Multi-Warehouse Smart Order Routing and Latency-Cost Optimization
`;

async function testShopee() {
    const ai = new GeminiAiProvider();
    let log = "Starting testShopee...\n";
    try {
        const res = await ai.parseRequirementsAsync(shopeePrompt);
        log += "=== SUCCESS ===\n" + JSON.stringify(res, null, 2);
    } catch (err) {
        log += "=== ERROR ===\n" + (err.stack || err.message || String(err));
    }
    fs.writeFileSync('./shopee_output.txt', log, 'utf-8');
    console.log("Done. Wrote to shopee_output.txt");
}

testShopee();
