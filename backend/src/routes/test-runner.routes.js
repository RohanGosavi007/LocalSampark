const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');
const { requireAdmin } = require('../middleware/auth.middleware');

// In-memory test execution state tracker
let activeTestRun = null;
const testLogsHistory = [];

/**
 * Maps suitenames to npm/npx execution commands
 */
const TEST_SUITES = {
  unit: { name: 'Backend Unit Tests', cmd: 'npx', args: ['jest', '--testPathIgnorePatterns=setup'] },
  auth: { name: 'Auth Middleware Tests', cmd: 'npx', args: ['jest', 'src/__tests__/middleware/auth.middleware.test.js'] },
  payment: { name: 'Payment Gateway Tests', cmd: 'npx', args: ['jest', 'src/__tests__/services/payment.gateway.test.js'] },
  security: { name: 'Security & Injection Tests', cmd: 'npx', args: ['jest', 'src/__tests__/integration/security.test.js'] },
  'e2e-web': { name: 'E2E Web App Tests', cmd: 'npx', args: ['playwright', 'test', '--project=web-chromium'] },
  'e2e-admin': { name: 'E2E Admin Panel Tests', cmd: 'npx', args: ['playwright', 'test', '--project=admin-chromium'] },
  api: { name: 'API Contract Tests', cmd: 'npx', args: ['playwright', 'test', '--project=api'] },
  a11y: { name: 'Accessibility WCAG Tests', cmd: 'npx', args: ['playwright', 'test', '--project=a11y'] },
  visual: { name: 'Visual Regression Tests', cmd: 'npx', args: ['playwright', 'test', '--project=visual'] },
  load: { name: 'Artillery Load Tests', cmd: 'npx', args: ['artillery', 'run', 'backend/load-tests/critical-flow.yml'] },
};

// GET /api/v1/test-runner/suites - List available suites and status
router.get('/suites', requireAdmin, (req, res) => {
  res.json({
    success: true,
    activeRun: activeTestRun ? {
      suite: activeTestRun.suite,
      suiteName: activeTestRun.suiteName,
      status: activeTestRun.status,
      startTime: activeTestRun.startTime,
      logsCount: activeTestRun.logs.length
    } : null,
    suites: Object.keys(TEST_SUITES).map(key => ({
      id: key,
      name: TEST_SUITES[key].name
    }))
  });
});

// POST /api/v1/test-runner/run - Trigger a test suite execution
router.post('/run', requireAdmin, (req, res) => {
  const { suite } = req.body;
  if (!TEST_SUITES[suite] && suite !== 'all') {
    return res.status(400).json({ success: false, error: 'Invalid test suite requested' });
  }

  if (activeTestRun && activeTestRun.status === 'running') {
    return res.status(409).json({ success: false, error: 'A test suite is already executing' });
  }

  const projectRoot = path.resolve(__dirname, '../../../..');
  let cmd, args;

  if (suite === 'all') {
    cmd = 'npm';
    args = ['run', 'test:unit'];
  } else {
    cmd = TEST_SUITES[suite].cmd;
    args = TEST_SUITES[suite].args;
  }

  activeTestRun = {
    id: `run_${Date.now()}`,
    suite,
    suiteName: suite === 'all' ? 'All Unit & Security Tests' : TEST_SUITES[suite].name,
    status: 'running',
    startTime: new Date().toISOString(),
    endTime: null,
    exitCode: null,
    logs: []
  };

  const processOptions = {
    cwd: suite.startsWith('e2e') || suite === 'api' || suite === 'a11y' || suite === 'visual' ? projectRoot : path.resolve(__dirname, '../..'),
    shell: true,
    env: { ...process.env, FORCE_COLOR: '0', NODE_ENV: 'test' }
  };

  const child = spawn(cmd, args, processOptions);

  child.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(Boolean);
    activeTestRun.logs.push(...lines);
  });

  child.stderr.on('data', (data) => {
    const lines = data.toString().split('\n').filter(Boolean);
    activeTestRun.logs.push(...lines);
  });

  child.on('close', (code) => {
    activeTestRun.status = code === 0 ? 'passed' : 'failed';
    activeTestRun.endTime = new Date().toISOString();
    activeTestRun.exitCode = code;

    testLogsHistory.unshift({ ...activeTestRun });
    if (testLogsHistory.length > 20) testLogsHistory.pop();
  });

  res.json({
    success: true,
    message: `Test suite '${activeTestRun.suiteName}' started`,
    runId: activeTestRun.id
  });
});

// GET /api/v1/test-runner/status - Stream or fetch current execution status & logs
router.get('/status', requireAdmin, (req, res) => {
  if (!activeTestRun) {
    return res.json({ success: true, activeRun: null, history: testLogsHistory.slice(0, 5) });
  }

  res.json({
    success: true,
    activeRun: {
      id: activeTestRun.id,
      suite: activeTestRun.suite,
      suiteName: activeTestRun.suiteName,
      status: activeTestRun.status,
      startTime: activeTestRun.startTime,
      endTime: activeTestRun.endTime,
      exitCode: activeTestRun.exitCode,
      logs: activeTestRun.logs
    },
    history: testLogsHistory.slice(0, 5)
  });
});

module.exports = router;
