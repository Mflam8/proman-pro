
import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const InputField = ({ id, label, ...props }) => (
  <div>
    <Label htmlFor={id} className="block text-sm font-medium text-proman-navy mb-1">{label}</Label>
    <Input id={id} {...props} />
  </div>
);

export const SelectField = ({ label, options, ...props }) => (
  <div>
    <Label className="block text-sm font-medium text-proman-navy mb-1">{label}</Label>
    <Select {...props}>
      <SelectTrigger>
        <SelectValue placeholder={`Seleccionar ${label.toLowerCase()}`} />
      </SelectTrigger>
      <SelectContent>
        {options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  </div>
);

export const InfoRow = ({ label, value }) => (
  <div className="flex justify-between">
    <span className="text-gray-600">{label}:</span>
    <span className="font-medium text-right">{value}</span>
  </div>
);
