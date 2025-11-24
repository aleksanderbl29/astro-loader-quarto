/**
 * Utility for auto-rendering Quarto content
 */

import { spawn } from 'child_process';

/**
 * Configuration for Quarto auto-rendering
 */
export interface QuartoRenderOptions {
  enabled: boolean;
  command?: string;
  args?: string[];
  format?: string;
}

/**
 * Check if Quarto is installed and available
 */
export async function checkQuartoInstalled(command: string = 'quarto'): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn(command, ['--version'], { stdio: 'ignore' });
    proc.on('close', (code) => {
      resolve(code === 0);
    });
    proc.on('error', () => {
      resolve(false);
    });
  });
}

/**
 * Render Quarto content using the quarto command
 * 
 * @param quartoRoot - Path to Quarto project directory
 * @param options - Rendering options
 */
export async function renderQuarto(
  quartoRoot: string,
  options: QuartoRenderOptions
): Promise<void> {
  if (!options.enabled) {
    return;
  }
  
  const command = options.command || 'quarto';
  
  // Check if Quarto is installed
  const isInstalled = await checkQuartoInstalled(command);
  if (!isInstalled) {
    throw new Error(
      `Quarto command '${command}' not found.\n` +
      `Please install Quarto from https://quarto.org/docs/get-started/\n` +
      `Or set autoRender to false and run 'quarto render' manually.`
    );
  }
  
  // Build command arguments
  const args = options.args || ['render'];
  
  // Add format flag if specified
  if (options.format) {
    args.push('--to', options.format);
  }
  
  // Execute quarto render
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      cwd: quartoRoot,
      stdio: 'inherit',
    });
    
    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(
            `Quarto render failed with exit code ${code}.\n` +
            `Try running 'quarto render' manually in the ${quartoRoot} directory to see the full error.`
          )
        );
      }
    });
    
    proc.on('error', (error) => {
      reject(
        new Error(
          `Failed to execute Quarto render: ${error.message}\n` +
          `Make sure Quarto is installed: https://quarto.org/docs/get-started/`
        )
      );
    });
  });
}

/**
 * Normalize autoRender configuration
 */
export function normalizeAutoRenderConfig(
  autoRender?: boolean | QuartoRenderOptions
): QuartoRenderOptions {
  if (autoRender === undefined || autoRender === false) {
    return { enabled: false };
  }
  
  if (autoRender === true) {
    return {
      enabled: true,
      command: 'quarto',
      args: ['render'],
      format: 'gfm',
    };
  }
  
  // Object configuration
  return {
    enabled: autoRender.enabled,
    command: autoRender.command || 'quarto',
    args: autoRender.args || ['render'],
    format: autoRender.format || 'gfm',
  };
}

