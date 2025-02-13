"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { format } from "date-fns";
import { toast } from "sonner";
import styles from "./ExpenseFormMobile.module.css"; // Assuming you have a CSS module for styles

type ExpenseFormData = {
  date: string
  category_id: string
  description: string
  quantity: number
  unit: string
  amount: number
  supplier_id?: string
  note?: string
  cost_per_100g?: number | null
}

type ExpenseFormProps = {
  onClose: () => void
}

export default function ExpenseForm({ onClose }: ExpenseFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ExpenseFormData>()
  const queryClient = useQueryClient()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [descriptionSuggestions, setDescriptionSuggestions] = useState<string[]>([])

  // Fetch categories
  const { data: categories, isLoading: isCategoriesLoading, isError: isCategoriesError } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*")
      if (error) throw error
      return data
    },
  })

  // Fetch suppliers
  const { data: suppliers, isLoading: isSuppliersLoading, isError: isSuppliersError } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("suppliers").select("*")
      if (error) throw error
      return data
    },
  })

  // Fetch previous descriptions
  const { data: previousDescriptions } = useQuery({
    queryKey: ["previousDescriptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("description")
        .order("description", { ascending: true })
        .limit(100) // Limit to the 100 most common descriptions
      if (error) throw error
      return data.map((item: { description: string }) => item.description)
    },
  })

  const addExpenseMutation = useMutation({
    mutationFn: async (data: ExpenseFormData) => {
      const formattedDate = format(new Date(data.date), 'yyyy-MM-dd')

      // Check for duplicate entries
      const { data: existingExpense, error: checkError } = await supabase
        .from("expenses")
        .select()
        .eq("date", formattedDate)
        .eq("category_id", data.category_id)
        .eq("description", data.description)
        .eq("quantity", data.quantity)
        .eq("unit", data.unit)
        .eq("amount", data.amount)
        .maybeSingle()

      if (checkError && checkError.code !== "PGRST116") {
        throw checkError
      }

      if (existingExpense) {
        throw new Error("Duplicate expense entry")
      }

      // Add expense
      const { data: newExpense, error } = await supabase.from("expenses").insert([{
        ...data,
        date: formattedDate,
        cost_per_100g: data.cost_per_100g ? data.cost_per_100g : null,
      }]).select().single()

      if (error) throw error

      return newExpense
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["totalExpenses"] })
      queryClient.invalidateQueries({ queryKey: ["todayExpenses"] }) // Invalidate today's expenses query

      // Reset fields except for date, supplier, and category
      reset({
        date: watch("date"),
        category_id: watch("category_id"),
        supplier_id: watch("supplier_id"),
        description: "",
        quantity: 0,
        unit: "",
        amount: 0,
        note: "",
        cost_per_100g: null,
      })
    },
    onError: (error) => {
      console.error("Error adding expense:", error)
      toast.error("Error adding expense. Please try again.")
    },
    onSettled: () => {
      setIsSubmitting(false)
    },
  })

  const onSubmit = async (data: ExpenseFormData) => {
    setIsSubmitting(true)
    addExpenseMutation.mutate(data)
  }

  const handleDescriptionInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target.value.toLowerCase()
    const suggestions = previousDescriptions?.filter(description =>
      description.toLowerCase().includes(input)
    ) || []
    setDescriptionSuggestions(suggestions)
  }

  const handleDescriptionSelect = (description: string) => {
    setValue("description", description)
    setDescriptionSuggestions([])
  }

  const category = watch("category_id")
  const quantity = watch("quantity")
  const amount = watch("amount")
  const unit = watch("unit")

  useEffect(() => {
    if (category && quantity && amount && unit) {
      const selectedCategory = categories?.find(cat => cat.id === category)
      if (selectedCategory?.name === "Ingredient" && quantity > 0) {
        let costPer100g
        if (unit === "Kg") {
          costPer100g = (amount / (quantity * 1000)) * 100
        } else {
          costPer100g = (amount / quantity) * 100
        }
        setValue("cost_per_100g", costPer100g)
      } else {
        setValue("cost_per_100g", null)
      }
    }
  }, [category, quantity, amount, unit, categories, setValue])

  if (isCategoriesLoading || isSuppliersLoading) {
    return <div className="text-center">Loading form data...</div>
  }

  if (isCategoriesError || isSuppliersError) {
    return <div className="text-center text-red-600">Error loading form data. Please try again.</div>
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Add Expense</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className={styles.group}>
            <input
              type="date"
              id="date"
              {...register("date", { required: true })}
              defaultValue={new Date().toISOString().split("T")[0]}
              className={styles.input}
              placeholder="Date"
            />
            <span className={styles.bar}></span>
          </div>
          <div className={styles.group}>
            <select
              id="category_id"
              {...register("category_id", { required: true })}
              className={styles.input}
            >
              <option value="">Select a category</option>
              {categories?.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <span className={styles.bar}></span>
          </div>
          <div className={styles.group} style={{ position: "relative" }}>
            <input
              type="text"
              id="description"
              {...register("description", { required: true })}
              className={styles.input}
              placeholder="Description"
              onChange={handleDescriptionInput}
            />
            <span className={styles.bar}></span>
            {descriptionSuggestions.length > 0 && (
              <ul className={styles.suggestions}>
                {descriptionSuggestions.map((suggestion, index) => (
                  <li
                    key={index}
                    className={styles.suggestion}
                    onClick={() => handleDescriptionSelect(suggestion)}
                  >
                    {suggestion}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex gap-2">
            <div className={`${styles.group} flex-1`}>
              <input
                type="number"
                id="quantity"
                {...register("quantity", { required: true, min: 0 })}
                className={styles.input}
                placeholder="Quantity"
              />
              <span className={styles.bar}></span>
            </div>
            {category && categories?.find(cat => cat.id === category)?.name === "Ingredient" ? (
              <div className={`${styles.group} flex-1`}>
                <select
                  id="unit"
                  {...register("unit", { required: true })}
                  className={styles.input}
                >
                  <option value="g">Grams (g)</option>
                  <option value="Kg">Kilograms (Kg)</option>
                </select>
                <span className={styles.bar}></span>
              </div>
            ) : (
              <div className={`${styles.group} flex-1`}>
                <input
                  type="text"
                  id="unit"
                  {...register("unit", { required: true })}
                  className={styles.input}
                  placeholder="Unit"
                />
                <span className={styles.bar}></span>
              </div>
            )}
          </div>
          <div className={styles.group}>
            <input
              type="number"
              id="amount"
              {...register("amount", { required: true, min: 0 })}
              step="0.01"
              className={styles.input}
              placeholder="Amount"
            />
            <span className={styles.bar}></span>
          </div>
          <div className={styles.group}>
            <input
              type="number"
              id="cost_per_100g"
              {...register("cost_per_100g")}
              step="0.01"
              className={styles.input}
              placeholder="Cost per 100g (optional)"
              readOnly
            />
            <span className={styles.bar}></span>
          </div>
          <div className={styles.group}>
            <select
              id="supplier_id"
              {...register("supplier_id")}
              className={styles.input}
            >
              <option value="">Select a supplier</option>
              {suppliers?.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
            <span className={styles.bar}></span>
          </div>
          <div className={styles.group}>
            <textarea
              id="note"
              {...register("note")}
              className={styles.input}
              placeholder="Note (optional)"
            ></textarea>
            <span className={styles.bar}></span>
          </div>
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isSubmitting ? "Submitting..." : "Submit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
