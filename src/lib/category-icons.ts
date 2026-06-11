import {
  Tag, ShoppingBag, ShoppingCart, Utensils, Coffee, Pizza, Wine, Beer,
  Home, Building2, Car, Bus, Train, Plane, Bike, Fuel,
  Heart, HeartPulse, Stethoscope, Dumbbell, Pill, Cross,
  GraduationCap, BookOpen, School, Laptop, Smartphone, Gamepad2,
  Film, Music, Tv, Camera, Headphones, Mic,
  Briefcase, DollarSign, Banknote, CreditCard, PiggyBank, TrendingUp, LineChart, Wallet,
  Gift, Sparkles, Star, Trophy, Award, Crown,
  Shirt, Scissors, Baby, Cat, Dog, PawPrint,
  Wrench, Hammer, Lightbulb, Wifi, Zap, Flame, Droplet,
  Sun, Cloud, Trees, Mountain, Tent, Umbrella,
  Hospital, Church, Landmark, Receipt, FileText, Mail, Phone,
  Globe, MapPin, Map, Send, Plus, Repeat,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Tag, ShoppingBag, ShoppingCart, Utensils, Coffee, Pizza, Wine, Beer,
  Home, Building2, Car, Bus, Train, Plane, Bike, Fuel,
  Heart, HeartPulse, Stethoscope, Dumbbell, Pill, Cross,
  GraduationCap, BookOpen, School, Laptop, Smartphone, Gamepad2,
  Film, Music, Tv, Camera, Headphones, Mic,
  Briefcase, DollarSign, Banknote, CreditCard, PiggyBank, TrendingUp, LineChart, Wallet,
  Gift, Sparkles, Star, Trophy, Award, Crown,
  Shirt, Scissors, Baby, Cat, Dog, PawPrint,
  Wrench, Hammer, Lightbulb, Wifi, Zap, Flame, Droplet,
  Sun, Cloud, Trees, Mountain, Tent, Umbrella,
  Hospital, Church, Landmark, Receipt, FileText, Mail, Phone,
  Globe, MapPin, Map, Send, Plus, Repeat,
};

export const CATEGORY_ICON_NAMES = Object.keys(CATEGORY_ICONS);

export const CATEGORY_COLORS = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899",
  "#06B6D4", "#84CC16", "#F97316", "#14B8A6", "#A855F7", "#0EA5E9",
  "#22C55E", "#EAB308", "#F43F5E", "#6366F1", "#D946EF", "#64748B",
];

export function getCategoryIcon(name: string | null | undefined): LucideIcon {
  if (!name) return Tag;
  return CATEGORY_ICONS[name] ?? Tag;
}
