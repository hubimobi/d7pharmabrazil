import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Save, LogOut, ArrowLeft } from "lucide-react";

interface Props {
  open: boolean;
  onStay: () => void;
  onLeave: () => void;
  onSaveAndLeave?: () => void;
  hasSave?: boolean;
}

export default function UnsavedChangesDialog({ open, onStay, onLeave, onSaveAndLeave, hasSave }: Props) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Alterações não salvas</AlertDialogTitle>
          <AlertDialogDescription>
            Você tem alterações que ainda não foram salvas. O que deseja fazer?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex gap-2 sm:gap-2">
          <Button variant="outline" onClick={onStay} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Ficar
          </Button>
          <Button variant="destructive" onClick={onLeave} className="gap-1.5">
            <LogOut className="h-4 w-4" /> Sair
          </Button>
          {hasSave && onSaveAndLeave && (
            <Button onClick={onSaveAndLeave} className="gap-1.5">
              <Save className="h-4 w-4" /> Salvar e Sair
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
