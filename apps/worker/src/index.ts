import { JOB_NAMES, SYSTEM_NAME } from "@crm-erp-pnf/domain";

const workerName = process.env.WORKER_NAME ?? "crm-erp-pnf-worker";

function heartbeat() {
  console.log(`[${new Date().toISOString()}] ${workerName} online for ${SYSTEM_NAME}`);
  console.log(`Registered placeholder jobs: ${JOB_NAMES.join(", ")}`);
}

heartbeat();
setInterval(heartbeat, 30000);
