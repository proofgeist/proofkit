import { AlertTriangle } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "./ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <div className="w-full max-w-2xl rounded-lg border border-destructive/50 bg-destructive/10 p-6">
            <div className="mb-4 flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              <h2 className="font-semibold text-2xl text-destructive">Something went wrong</h2>
            </div>
            <p className="mb-4 text-destructive/90">
              An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.
            </p>
            {this.state.error && (
              <details className="mb-4">
                <summary className="mb-2 cursor-pointer text-muted-foreground text-sm hover:text-foreground">
                  Error details
                </summary>
                <div className="max-h-64 overflow-auto rounded-md bg-muted p-4 font-mono text-sm">
                  <div className="mb-2 font-semibold text-destructive">
                    {this.state.error.name}: {this.state.error.message}
                  </div>
                  {this.state.error.stack && (
                    <pre className="whitespace-pre-wrap text-xs">{this.state.error.stack}</pre>
                  )}
                  {this.state.errorInfo && (
                    <div className="mt-4 border-border border-t pt-4">
                      <div className="mb-2 font-semibold text-muted-foreground">Component Stack:</div>
                      <pre className="whitespace-pre-wrap text-xs">{this.state.errorInfo.componentStack}</pre>
                    </div>
                  )}
                </div>
              </details>
            )}
            <div className="flex gap-2">
              <Button onClick={this.handleReset} variant="primary">
                Try again
              </Button>
              <Button onClick={() => window.location.reload()} variant="outline">
                Reload page
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
