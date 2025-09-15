#!/usr/bin/env node

/*
 * Aqara Sensor Detection System - Main Index
 * ------------------------------------------
 * Easy command-line interface to run all sensor detection tools
 * Usage: node index.js [command]
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Available commands and their descriptions
const COMMANDS = {
  'test': {
    file: 'aqara-new.js',
    description: 'Test connection and list all devices'
  },
  'auth': {
    file: 'aqara-auth.js', 
    description: 'Fix authentication and refresh tokens'
  },
  'monitor': {
    file: 'motion-monitor.js',
    description: 'Simple motion sensor monitoring'
  },
  'webhook': {
    file: 'webhook-sensor-detector.js',
    description: 'Advanced webhook-based sensor detection system'
  },
  'status': {
    file: 'test-webhook-status.js',
    description: 'Check webhook server status and changes'
  },
  'summary': {
    file: 'sensor-summary.js',
    description: 'Show complete system summary'
  },
  'setup-webhook': {
    file: 'setup-webhooks.js',
    description: 'Setup webhook configuration (may need permissions)'
  },
  'scene-test': {
    file: 'sensor-test.js',
    description: 'Test sensors and create automation scenes'
  },
  'actions': {
    file: 'check-actions.js',
    description: 'Check available actions for scene creation'
  },
  'automation': {
    file: 'sensor-scene-automation.js',
    description: 'Create sensor-triggered automation scenes'
  }
};

// Color functions for terminal output
const colors = {
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
  bold: (text) => `\x1b[1m${text}\x1b[0m`
};

function showHelp() {
  console.log(colors.bold('🏠 Aqara Sensor Detection System'));
  console.log('='.repeat(40));
  console.log(colors.cyan('Usage: node index.js [command]'));
  console.log('\n📋 Available Commands:\n');
  
  Object.entries(COMMANDS).forEach(([cmd, info]) => {
    const cmdColor = colors.green(`  ${cmd.padEnd(15)}`);
    const descColor = colors.yellow(info.description);
    console.log(`${cmdColor} ${descColor}`);
  });
  
  console.log('\n🚀 Quick Start Commands:');
  console.log(colors.blue('  node index.js test      ') + '← Start here to test connection');
  console.log(colors.blue('  node index.js webhook   ') + '← Main sensor detection system'); 
  console.log(colors.blue('  node index.js status    ') + '← Check system status');
  console.log(colors.blue('  node index.js summary   ') + '← View complete overview');
  
  console.log('\n💡 Examples:');
  console.log('  node index.js test           # Test API connection');
  console.log('  node index.js webhook        # Start main detection system');
  console.log('  node index.js status         # Check current status');
  console.log('  node index.js monitor        # Simple motion monitoring');
  
  console.log('\n📝 Notes:');
  console.log('  • Use Ctrl+C to stop running processes');
  console.log('  • Run "webhook" command first for full functionality');
  console.log('  • Check .env file for API credentials');
}

function runCommand(command) {
  const cmd = COMMANDS[command];
  
  if (!cmd) {
    console.log(colors.red(`❌ Unknown command: ${command}`));
    console.log(colors.yellow('💡 Run "node index.js" to see available commands'));
    return;
  }
  
  const filePath = path.join(__dirname, cmd.file);
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    console.log(colors.red(`❌ File not found: ${cmd.file}`));
    return;
  }
  
  console.log(colors.blue(`🚀 Running: ${cmd.description}`));
  console.log(colors.cyan(`📄 File: ${cmd.file}`));
  console.log('-'.repeat(50));
  
  // Spawn the process
  const child = spawn('node', [filePath], {
    stdio: 'inherit',
    shell: true
  });
  
  child.on('error', (err) => {
    console.log(colors.red(`❌ Error running ${cmd.file}: ${err.message}`));
  });
  
  child.on('close', (code) => {
    if (code !== 0) {
      console.log(colors.red(`❌ Process exited with code ${code}`));
    } else {
      console.log(colors.green(`✅ Process completed successfully`));
    }
  });
}

// Interactive menu
function showInteractiveMenu() {
  console.log(colors.bold('\n🎯 Interactive Menu'));
  console.log('='.repeat(20));
  
  const menuItems = [
    '1. Test API Connection',
    '2. Start Main Sensor Detection System',
    '3. Check System Status', 
    '4. View System Summary',
    '5. Simple Motion Monitoring',
    '6. Test Sensors & Create Scenes',
    '7. Check Available Actions',
    '8. Fix Authentication',
    '9. Setup Webhooks',
    '0. Exit'
  ];
  
  menuItems.forEach(item => {
    console.log(colors.yellow(item));
  });
  
  console.log(colors.cyan('\nEnter your choice (0-9):'));
  
  process.stdin.once('data', (data) => {
    const choice = data.toString().trim();
    
    switch(choice) {
      case '1': runCommand('test'); break;
      case '2': runCommand('webhook'); break;
      case '3': runCommand('status'); break;
      case '4': runCommand('summary'); break;
      case '5': runCommand('monitor'); break;
      case '6': runCommand('scene-test'); break;
      case '7': runCommand('actions'); break;
      case '8': runCommand('auth'); break;
      case '9': runCommand('setup-webhook'); break;
      case '0': 
        console.log(colors.green('👋 Goodbye!'));
        process.exit(0);
        break;
      default:
        console.log(colors.red('❌ Invalid choice'));
        showInteractiveMenu();
        break;
    }
  });
}

// Main execution
function main() {
  const command = process.argv[2];
  
  if (!command) {
    showHelp();
    showInteractiveMenu();
    return;
  }
  
  if (command === 'help' || command === '--help' || command === '-h') {
    showHelp();
    return;
  }
  
  if (command === 'list') {
    console.log(colors.bold('📋 Available Files:'));
    Object.entries(COMMANDS).forEach(([cmd, info]) => {
      console.log(`  ${colors.green(cmd)}: ${colors.blue(info.file)}`);
    });
    return;
  }
  
  runCommand(command);
}

// Handle process termination
process.on('SIGINT', () => {
  console.log(colors.yellow('\n🛑 Process interrupted'));
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log(colors.yellow('\n🛑 Process terminated'));
  process.exit(0);
});

// Run main function
main();