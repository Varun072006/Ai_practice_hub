import axios from 'axios';
import logger from '../config/logger';

interface PistonNode {
  url: string;
  healthy: boolean;
  failCount: number;
  lastCheck: number;
}

// Fetch hosts from environment, defaulting to localhost for dev
const HOSTS = (process.env.PISTON_HOSTS || 'http://localhost:2000').split(',').map(s => s.trim());

const nodes: PistonNode[] = HOSTS.map(url => ({
  url,
  healthy: true,
  failCount: 0,
  lastCheck: Date.now()
}));

let currentIndex = 0;

/**
 * Get all configured Piston hosts (used for warmup).
 */
export function getAllHosts(): string[] {
  return nodes.map(n => n.url);
}

/**
 * Get the next healthy Piston host using round-robin.
 * If all are unhealthy, falls back to the first node to avoid complete outage
 * and to allow recovery if the health check hasn't run yet.
 */
export function getNextHost(): string {
  if (nodes.length === 1) return nodes[0].url;

  let attempts = 0;
  while (attempts < nodes.length) {
    const node = nodes[currentIndex];
    currentIndex = (currentIndex + 1) % nodes.length;
    if (node.healthy) {
      return node.url;
    }
    attempts++;
  }

  logger.warn('[LoadBalancer] All Piston nodes reporting unhealthy! Falling back to default node.');
  return nodes[0].url;
}

/**
 * Report a successful execution to reset the fail count of a node.
 */
export function reportSuccess(url: string) {
  const node = nodes.find(n => n.url === url);
  if (node) {
    node.failCount = 0;
    if (!node.healthy) {
      logger.info(`[LoadBalancer] Node ${url} recovered and is marked healthy again.`);
      node.healthy = true;
    }
  }
}

/**
 * Report an execution failure for a node.
 * If it fails 3 consecutive times, mark it as unhealthy.
 */
export function reportFailure(url: string) {
  const node = nodes.find(n => n.url === url);
  if (node) {
    node.failCount++;
    if (node.failCount >= 3 && node.healthy) {
      logger.warn(`[LoadBalancer] Node ${url} failed 3 times in a row. Marking as unhealthy.`);
      node.healthy = false;
    }
  }
}

/**
 * Background health check worker.
 * Probes the /api/v2/runtimes endpoint of all nodes every 10 seconds.
 */
export function startHealthChecks() {
  setInterval(async () => {
    for (const node of nodes) {
      try {
        await axios.get(`${node.url}/api/v2/runtimes`, { timeout: 2000 });
        
        // Node is alive
        node.lastCheck = Date.now();
        if (!node.healthy) {
          logger.info(`[LoadBalancer] Background check: Node ${node.url} is back online.`);
          node.healthy = true;
          node.failCount = 0;
        }
      } catch (err: any) {
        // Node is dead or slow
        if (node.healthy) {
          logger.warn(`[LoadBalancer] Background check failed for ${node.url}: ${err.message}. Marking unhealthy.`);
          node.healthy = false;
        }
      }
    }
  }, 10000);
}
