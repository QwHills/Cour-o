// Product management for an independent teacher. Mirrors OrgProductsScreen
// but sets owner = { type: 'teacher', id: current_teacher.id } so packs /
// subscriptions / single-class offers are sold under the teacher's name.
// Students buying here get a wallet attached to the teacher (not an org).

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { authService } from '../../services/auth.service';
import { teachersService } from '../../services/teachers.service';
import { productsService } from '../../services/products.service';
import { Product, ProductKind, TeacherProfile } from '../../types/domain';
import { colors, spacing, radii, shadows } from '../../theme/theme';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const KIND_LABEL: Record<ProductKind, string> = {
  single_class: 'Cours à l\'unité',
  credit_pack: 'Pack de crédits',
  monthly_subscription: 'Abonnement mensuel',
};

const KIND_ICON: Record<ProductKind, string> = {
  single_class: '🎟️',
  credit_pack: '🎁',
  monthly_subscription: '💳',
};

export default function ProOffersScreen() {
  const navigation = useNavigation();
  const [, setTick] = useState(0);
  useEffect(() => productsService.onChange(() => setTick((t) => t + 1)), []);

  // Resolve the logged-in teacher's profile (Sophie / James / etc.).
  const [teacher, setTeacher] = useState<TeacherProfile | undefined>();
  useEffect(() => {
    const u = authService.getCurrentUser();
    if (!u) return;
    teachersService.getByUserId(u.id).then(setTeacher);
  }, []);

  const products = teacher
    ? productsService.listForOwner({ type: 'teacher', id: teacher.id }, { onlyActive: false })
    : [];

  const [createOpen, setCreateOpen] = useState(false);

  const handleDeactivate = (p: Product) => {
    Alert.alert(
      'Désactiver cette offre ?',
      "Les élèves ne pourront plus l'acheter. Les abonnements en cours restent valides jusqu'à expiration.",
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Désactiver',
          style: 'destructive',
          onPress: async () => {
            try {
              await productsService.deactivate(p.id);
            } catch (e: any) {
              Alert.alert('Erreur', e.message);
            }
          },
        },
      ],
    );
  };

  if (!teacher) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.back}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mes offres</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.body}>
          <Text style={styles.loadingText}>Chargement de ton profil…</Text>
        </View>
      </View>
    );
  }

  const active = products.filter((p) => p.active);
  const inactive = products.filter((p) => !p.active);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mes offres</Text>
        <TouchableOpacity onPress={() => setCreateOpen(true)} style={styles.addBtn}>
          <Text style={styles.addBtnText}>+ Créer</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.intro}>
          Crée des abonnements, packs de crédits ou cours à l'unité que tes
          élèves peuvent acheter. Les crédits sont utilisables sur tes cours.
        </Text>

        {products.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="card-outline" size={48} color={colors.textLight} />
            <Text style={styles.emptyTitle}>Aucune offre</Text>
            <Text style={styles.emptyText}>
              Crée ta première offre pour que tes élèves réguliers puissent
              acheter un pack ou s'abonner.
            </Text>
            <Button
              label="+ Créer ma première offre"
              variant="pro"
              onPress={() => setCreateOpen(true)}
              style={{ marginTop: spacing.lg, alignSelf: 'stretch' }}
            />
          </View>
        ) : (
          <>
            {active.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>
                  Offres actives · {active.length}
                </Text>
                {active.map((p) => (
                  <ProductRow key={p.id} product={p} onDeactivate={() => handleDeactivate(p)} />
                ))}
              </View>
            )}

            {inactive.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>
                  Archivées · {inactive.length}
                </Text>
                {inactive.map((p) => (
                  <ProductRow key={p.id} product={p} />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <CreateProductModal
        visible={createOpen}
        teacherId={teacher.id}
        onClose={() => setCreateOpen(false)}
      />
    </View>
  );
}

function ProductRow({
  product,
  onDeactivate,
}: {
  product: Product;
  onDeactivate?: () => void;
}) {
  return (
    <Card style={{ ...styles.row, ...(product.active ? {} : { opacity: 0.6 }) }}>
      <Text style={styles.icon}>{KIND_ICON[product.kind]}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={1}>{product.name}</Text>
        <View style={styles.meta}>
          <Badge label={KIND_LABEL[product.kind]} variant="neutral" small />
          {product.creditsGranted != null && (
            <Text style={styles.metaText}>
              {product.creditsGranted} crédit{product.creditsGranted > 1 ? 's' : ''}
            </Text>
          )}
          {product.billingInterval === 'monthly' && (
            <Text style={styles.metaText}>/ mois</Text>
          )}
          {product.validityDays != null && (
            <Text style={styles.metaText}>
              · valide {product.validityDays}j
            </Text>
          )}
        </View>
      </View>
      <View style={styles.right}>
        <Text style={styles.price}>{product.price.toFixed(2)}€</Text>
        {onDeactivate && (
          <TouchableOpacity onPress={onDeactivate} style={styles.archiveBtn}>
            <Text style={styles.archiveText}>Archiver</Text>
          </TouchableOpacity>
        )}
      </View>
    </Card>
  );
}

function CreateProductModal({
  visible,
  teacherId,
  onClose,
}: {
  visible: boolean;
  teacherId: string;
  onClose: () => void;
}) {
  const [kind, setKind] = useState<ProductKind>('credit_pack');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [credits, setCredits] = useState('');
  const [validityDays, setValidityDays] = useState('');
  const [loading, setLoading] = useState(false);

  // Switching kind resets the credits / validity defaults so the form always
  // shows sensible values for the new kind (prevents e.g. "1 crédit" carrying
  // over from single_class into an abonnement).
  const handleKindChange = (k: ProductKind) => {
    setKind(k);
    if (k === 'monthly_subscription') {
      setCredits('4');
      setValidityDays('30');
    } else if (k === 'credit_pack') {
      setCredits('10');
      setValidityDays('90');
    } else {
      setCredits('1');
      setValidityDays('');
    }
  };

  // Contextual copy per kind (placeholder + labels)
  const nameCopy = {
    monthly_subscription: {
      placeholder: 'Ex: Abonnement 2 cours par semaine',
      priceLabel: 'Prix / mois (€) *',
      pricePlaceholder: '49',
      unit: '/ mois',
    },
    credit_pack: {
      placeholder: 'Ex: Pack 10 cours de yoga',
      priceLabel: 'Prix du pack (€) *',
      pricePlaceholder: '120',
      unit: '',
    },
    single_class: {
      placeholder: 'Ex: Cours de yoga',
      priceLabel: 'Prix (€) *',
      pricePlaceholder: '18',
      unit: '',
    },
  }[kind];

  const reset = () => {
    setKind('credit_pack');
    setName('');
    setDescription('');
    setPrice('');
    setCredits('');
    setValidityDays('');
  };

  const handleSubmit = async () => {
    if (!name || !price) {
      Alert.alert('Champs manquants', 'Renseigne au moins le nom et le prix.');
      return;
    }
    const priceNum = parseFloat(price);
    const creditsNum = credits ? parseInt(credits, 10) : undefined;
    const validityNum = validityDays ? parseInt(validityDays, 10) : undefined;

    if (Number.isNaN(priceNum) || priceNum <= 0) {
      Alert.alert('Prix invalide', 'Le prix doit être un nombre supérieur à 0.');
      return;
    }
    if (kind !== 'single_class' && (!creditsNum || creditsNum <= 0)) {
      Alert.alert('Crédits invalides', 'Indique un nombre de crédits > 0.');
      return;
    }

    setLoading(true);
    try {
      await productsService.create({
        owner: { type: 'teacher', id: teacherId },
        kind,
        name,
        description: description || undefined,
        price: priceNum,
        creditsGranted: kind === 'single_class' ? 1 : creditsNum,
        billingInterval: kind === 'monthly_subscription' ? 'monthly' : undefined,
        // For monthly subscriptions we normalize to 30 days so the internal
        // renewal timer is stable regardless of calendar month length — the
        // actual next-charge date is computed from the purchase timestamp.
        validityDays: kind === 'monthly_subscription' ? 30 : validityNum,
      });
      Alert.alert('Offre créée ✓', `"${name}" est maintenant disponible à l'achat.`);
      reset();
      setTimeout(onClose, 300);
    } catch (e: any) {
      Alert.alert('Création impossible', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalBackdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={styles.modalBackdropTap} activeOpacity={1} onPress={onClose} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.modalTitle}>Créer une offre</Text>

            <Text style={styles.modalSection}>Type d'offre</Text>
            <View style={styles.kindRow}>
              {(['credit_pack', 'monthly_subscription', 'single_class'] as ProductKind[]).map((k) => (
                <TouchableOpacity
                  key={k}
                  style={[styles.kindChip, kind === k && styles.kindChipActive]}
                  onPress={() => handleKindChange(k)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.kindIcon}>{KIND_ICON[k]}</Text>
                  <Text
                    style={[
                      styles.kindChipText,
                      kind === k && styles.kindChipTextActive,
                    ]}
                  >
                    {KIND_LABEL[k]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Input
              label="Nom de l'offre *"
              placeholder={nameCopy.placeholder}
              value={name}
              onChangeText={setName}
            />

            <Input
              label="Description"
              placeholder="Détails, conditions, précisions…"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              style={{ minHeight: 70 }}
            />

            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <Input
                  label={nameCopy.priceLabel}
                  placeholder={nameCopy.pricePlaceholder}
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="numeric"
                />
              </View>
              {kind !== 'single_class' && (
                <View style={{ flex: 1 }}>
                  <Input
                    label={
                      kind === 'monthly_subscription'
                        ? 'Crédits / mois'
                        : 'Crédits inclus'
                    }
                    placeholder={kind === 'monthly_subscription' ? '4' : '10'}
                    value={credits}
                    onChangeText={setCredits}
                    keyboardType="numeric"
                  />
                </View>
              )}
            </View>

            {kind === 'credit_pack' && (
              <Input
                label="Validité des crédits (jours)"
                placeholder="90"
                value={validityDays}
                onChangeText={setValidityDays}
                keyboardType="numeric"
                hint="Durée avant expiration des crédits du pack."
              />
            )}
            {kind === 'monthly_subscription' && (
              <View style={styles.infoBox}>
                <Text style={styles.infoBoxIcon}>🔄</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoBoxTitle}>Renouvelé automatiquement chaque mois</Text>
                  <Text style={styles.infoBoxText}>
                    Les crédits sont rechargés à la date anniversaire du mois
                    suivant (sans souci des mois à 28/30/31 jours). Prélèvement
                    Stripe automatique.
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.previewBox}>
              <Text style={styles.previewTitle}>Aperçu côté élève</Text>
              <Text style={styles.previewLine}>
                {name || '(nom)'}
              </Text>
              <View style={styles.previewPriceRow}>
                <Text style={styles.previewPrice}>{price || '0'}€</Text>
                {nameCopy.unit !== '' && (
                  <Text style={styles.previewUnit}>{nameCopy.unit}</Text>
                )}
              </View>
              <Text style={styles.previewSub}>
                {kind === 'single_class'
                  ? "1 cours à l'unité"
                  : kind === 'monthly_subscription'
                    ? `${credits || '0'} crédit${Number(credits) > 1 ? 's' : ''} par mois · renouvelé automatiquement`
                    : `${credits || '0'} crédit${Number(credits) > 1 ? 's' : ''} valable${Number(credits) > 1 ? 's' : ''} ${validityDays || '90'} jours`}
              </Text>
            </View>

            <Button
              label={loading ? 'Création…' : "Créer l'offre"}
              variant="pro"
              loading={loading}
              onPress={handleSubmit}
              style={{ marginTop: spacing.md }}
            />
            <TouchableOpacity onPress={onClose} style={styles.cancelLink}>
              <Text style={styles.cancelLinkText}>Annuler</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  back: { fontSize: 24, color: colors.text },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  addBtn: {
    backgroundColor: colors.proAccent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    ...shadows.buttonPro,
  },
  addBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },

  scroll: { flex: 1 },
  body: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 14, color: colors.textLight },

  intro: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyState: { alignItems: 'center', padding: spacing.xl, marginTop: spacing.xxl, gap: spacing.sm },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: spacing.sm },
  emptyText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 19 },

  section: { paddingHorizontal: spacing.lg, marginTop: spacing.md },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },

  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  icon: { fontSize: 28 },
  name: { fontSize: 15, fontWeight: '700', color: colors.text },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  metaText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  right: { alignItems: 'flex-end' },
  price: { fontSize: 18, fontWeight: '800', color: colors.primary },
  archiveBtn: { paddingTop: 4 },
  archiveText: { fontSize: 11, fontWeight: '600', color: colors.textLight },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(26,23,20,0.4)', justifyContent: 'flex-end' },
  modalBackdropTap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl + 10,
    maxHeight: '88%',
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.md },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: spacing.md },
  modalSection: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: spacing.sm, marginTop: spacing.sm },
  kindRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  kindChip: {
    flex: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    gap: 4,
  },
  kindChipActive: { backgroundColor: colors.proAccent, borderColor: colors.proAccent },
  kindIcon: { fontSize: 20 },
  kindChipText: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, textAlign: 'center' },
  kindChipTextActive: { color: '#FFFFFF' },
  row2: { flexDirection: 'row', gap: spacing.md },
  previewBox: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.proAccent,
  },
  infoBox: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.proAccent,
    marginBottom: spacing.sm,
  },
  infoBoxIcon: { fontSize: 22 },
  infoBoxTitle: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 3 },
  infoBoxText: { fontSize: 12, color: colors.textSecondary, lineHeight: 17 },
  previewTitle: { fontSize: 11, fontWeight: '700', color: colors.textLight, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.xs },
  previewLine: { fontSize: 15, fontWeight: '700', color: colors.text },
  previewPriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 4 },
  previewPrice: { fontSize: 22, fontWeight: '800', color: colors.proAccent, letterSpacing: -0.5 },
  previewUnit: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  previewSub: { fontSize: 12, color: colors.textSecondary, marginTop: 4, lineHeight: 17 },
  cancelLink: { paddingVertical: spacing.sm, alignItems: 'center', marginTop: spacing.xs },
  cancelLinkText: { fontSize: 13, fontWeight: '600', color: colors.textLight },
});
