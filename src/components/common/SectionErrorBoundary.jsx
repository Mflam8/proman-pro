import React from "react";
import { AlertCircle } from "lucide-react";

export default class SectionErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {}

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <div className="flex items-center gap-2 font-medium">
            <AlertCircle className="h-4 w-4" />
            <span>{this.props.title || "Esta sección no pudo cargarse"}</span>
          </div>
          <p className="mt-2 text-red-600">Puedes seguir trabajando en el resto de la ficha.</p>
        </div>
      );
    }

    return this.props.children;
  }
}